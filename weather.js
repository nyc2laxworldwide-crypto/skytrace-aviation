module.exports = async function handler(req,res){
  const icao=String(req.query.icao||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);if(icao.length<3)return res.status(400).json({error:'ICAO required'});
  const h={'User-Agent':'SkyTrace-Aviation/1.0 contact: aviation-app'};
  async function get(path){const r=await fetch(`https://aviationweather.gov/api/data/${path}`,{headers:h});if(r.status===204)return null;if(!r.ok)throw new Error(String(r.status));const j=await r.json();return Array.isArray(j)?j[0]:j}
  try{const [metar,taf]=await Promise.all([get(`metar?ids=${icao}&format=json`),get(`taf?ids=${icao}&format=json`)]);res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=240');return res.status(200).json({metar,taf})}catch{return res.status(502).json({error:'Weather request failed'})}
}
