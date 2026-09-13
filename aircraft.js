module.exports = async function handler(req,res){
  const lat=Number(req.query.lat),lon=Number(req.query.lon),dist=Math.min(250,Math.max(1,Number(req.query.dist)||35));
  if(!Number.isFinite(lat)||!Number.isFinite(lon)) return res.status(400).json({error:'lat/lon required'});
  try{const u=`https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}`;const r=await fetch(u,{headers:{'User-Agent':'SkyTrace-Aviation/1.0'}});if(!r.ok) return res.status(r.status).json({error:'ADS-B upstream unavailable'});const d=await r.json();res.setHeader('Cache-Control','s-maxage=5, stale-while-revalidate=10');return res.status(200).json(d)}catch(e){return res.status(502).json({error:'ADS-B request failed'})}
}
