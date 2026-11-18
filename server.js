import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ALLOWED = ['yaencontre.com','idealista.com','fotocasa.es','pisos.com','habitaclia.com','indomio.es','solvia.es'];
const requests = new Map();

function validUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password &&
      (!u.port || u.port === '443') &&
      ALLOWED.some(d => u.hostname === d || u.hostname.endsWith('.' + d));
  } catch { return false; }
}
function reply(res, status, value) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(value));
}
function authorized(req) {
  const user = process.env.APP_USERNAME, pass = process.env.APP_PASSWORD;
  if (!user || !pass) return process.env.NODE_ENV !== 'production';
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Basic ')) return false;
  try {
    const actual = Buffer.from(Buffer.from(auth.slice(6), 'base64').toString('utf8'));
    const expected = Buffer.from(user + ':' + pass);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { return false; }
}
function rateLimit(req) {
  const ip = String(req.socket.remoteAddress || 'unknown').slice(0,80);
  const now = Date.now(), log = (requests.get(ip) || []).filter(t => t > now-3600000);
  if (log.length >= 20) return false;
  log.push(now); requests.set(ip,log);
  if (requests.size > 5000) requests.clear();
  return true;
}
async function readJson(req) {
  let size = 0, chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16000) throw Error('Solicitud demasiado grande');
    chunks.push(chunk);
  }
  if (!size) throw Error('Solicitud vacía');
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function extractJson(r) {
  let s = r.output_text || '';
  for (const item of r.output || []) for (const c of item.content || [])
    if (!s && c.type === 'output_text') s += c.text || '';
  s = s.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try { return JSON.parse(s); } catch {
    const first = s.indexOf('{'), last = s.lastIndexOf('}');
    if (first < 0 || last <= first) throw Error('La IA no devolvió un resultado legible.');
    return JSON.parse(s.slice(first,last+1));
  }
}
async function withAI(input, tokens = 3800) {
  if (!process.env.OPENAI_API_KEY) throw Error('Configura OPENAI_API_KEY en Hostinger');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{Authorization:'Bearer ' + process.env.OPENAI_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:MODEL,
        tools:[{type:'web_search_preview'}],
        instructions:'Eres analista de inversión inmobiliaria en España. Devuelve solo JSON válido. No inventes anuncios, precios, URL, superficies, rentas o fuentes. Separa hechos y estimaciones. Compara con pisos reales reformados de zona y superficie similares. Si no puedes comprobar el precio, usa price:null. Los comparables deben ser anuncios individuales verificables, no páginas de resultados. Escribe en español. La rentabilidad neta operativa no equivale a rentabilidad después de IRPF/IS.',
        input,max_output_tokens:tokens
      }),
      signal:controller.signal
    });
    const data = await response.json();
    if (!response.ok) throw Error('OpenAI ('+response.status+'): '+(data?.error?.message || 'Error de API'));
    return extractJson(data);
  } finally { clearTimeout(timeout); }
}
function comparables(list, original) {
  return (Array.isArray(list) ? list : []).filter(x => x && validUrl(x.url) && x.url !== original && Number(x.price)>0)
    .slice(0,6).map(x => ({title:String(x.title||'Anuncio comparable').slice(0,180),
      area:String(x.area||'').slice(0,120),sqm:Number(x.sqm)||null,beds:Number(x.beds)||null,
      price:Number(x.price),url:String(x.url),portal:String(x.portal||'').slice(0,80)}));
}
async function route(req,res) {
  const u = new URL(req.url || '/', 'http://localhost');
  if (!authorized(req)) {
    res.writeHead(401,{'WWW-Authenticate':'Basic realm="Carbe Partners"','Cache-Control':'no-store'});
    return res.end('Acceso restringido. Configura APP_USERNAME y APP_PASSWORD en Hostinger.');
  }
  if (req.method==='GET' && u.pathname==='/api/health')
    return reply(res,200,{ok:true,service:'Carbe Partners',ai_configured:!!process.env.OPENAI_API_KEY});
  if (req.method==='GET' && (u.pathname==='/' || u.pathname==='/index.html')) {
    const html=await readFile(path.join(ROOT,'index.html'));
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    return res.end(html);
  }
  if (req.method!=='POST' || !['/api/analyze','/api/comparables'].includes(u.pathname))
    return reply(res,404,{ok:false,error:'Ruta no encontrada'});
  if (!rateLimit(req)) return reply(res,429,{ok:false,error:'Límite de consultas por hora alcanzado'});
  try {
    const input=await readJson(req), url=String(input.url||'').trim();
    if (!validUrl(url)) throw Error('Introduce un enlace HTTPS válido de un portal inmobiliario compatible.');
    if (u.pathname==='/api/analyze') {
      const p=await withAI('Investiga este anuncio: '+url+'. Devuelve un objeto JSON con name,area,price,sqm,beds,baths,floor,reform,rent,fees,itp,expenses,condition,occupancy,ref,notes,summary,verdict,price_confidence,rent_basis,sources,risks,verified,uncertainties,rental_comparables,sale_comparables. Separa información comprobada de estimaciones. Estima inversión y alquiler a partir del inmueble y comparables reales. Para comparables usa objetos {title,area,sqm,beds,price,url,portal}. Reforma, alquiler y gastos numéricos; ITP=10, fees=1100, expenses=20 salvo evidencia en contrario. Si no puedes verificar price, price=null.',4700);
      if (!p || !Number.isFinite(Number(p.price)) || Number(p.price)<=0)
        throw Error('No se ha podido comprobar el precio. No se creará una ficha sin verificar.');
      p.price=Number(p.price);
      for (const k of ['reform','rent','fees','itp','expenses']) p[k]=Number(p[k]) || ({fees:1100,itp:10,expenses:20}[k]||0);
      p.rental_comparables=comparables(p.rental_comparables,url);
      p.sale_comparables=comparables(p.sale_comparables,url);
      p.url=url;
      return reply(res,200,{ok:true,property:p});
    }
    if (!['rental','sale'].includes(input.type)) throw Error('Tipo de búsqueda no válido');
    const type=input.type==='rental'?'ALQUILER':'VENTA';
    const area=String(input.area||'').slice(0,120);
    const sqm=String(input.sqm||'').slice(0,12);
    const beds=String(input.beds||'').slice(0,8);
    const extra=String(input.instructions||'').slice(0,500);
    const prompt='Busca hasta 6 anuncios individuales actuales y verificables de '+type+' en '+area+
      ', España, con unos '+sqm+' m² (+/-25%) y '+beds+' habitaciones. Prioriza pisos reformados o listos para entrar. Excluye '+url+
      '. Indicaciones: '+extra+'. Devuelve SOLO {"comparables":[{"title":"...","area":"...","sqm":60,"beds":2,"price":500,"url":"https://...","portal":"..."}]}. Usa rentas mensuales para alquiler. Si no puedes verificar URL y precio devuelve [].';
    const p=await withAI(prompt,2800);
    return reply(res,200,{ok:true,comparables:comparables(p.comparables,url)});
  } catch(e) {
    console.error('Error de análisis:',e.message);
    return reply(res,400,{ok:false,error:e.name==='AbortError'?'La búsqueda ha agotado el tiempo de espera':String(e.message).slice(0,500)});
  }
}
http.createServer((req,res)=>route(req,res).catch(e=>{
  console.error(e); if (!res.headersSent) reply(res,500,{ok:false,error:'Error interno'});
})).listen(PORT,HOST,()=>console.log('Carbe Partners activo en '+HOST+':'+PORT));
