import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, initDb } from './db.js';
import { ranks } from './ranks.js';

const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
const PgStore = connectPgSimple(session);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.disable('x-powered-by'); app.use(express.json({ limit: '100kb' }));
app.use(session({ store: new PgStore({ pool, tableName: 'sessions', createTableIfMissing: false }), secret: process.env.SESSION_SECRET || 'dev-secret-change-me', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000 } }));
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const auth = (req,res,next) => req.session.user ? next() : res.status(401).json({error:'Connectez-vous pour continuer.'});
app.get('/api/health', asyncRoute(async (_req,res)=>{await pool.query('SELECT 1');res.json({status:'ok'});}));
app.get('/api/auth/me',(req,res)=>res.json({user:req.session.user||null}));
app.post('/api/auth/register',asyncRoute(async(req,res)=>{
 const {email,password,name}=req.body||{}; const normalized=String(email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)||String(password||'').length<10||!String(name||'').trim()) return res.status(400).json({error:'Renseignez un nom, un e-mail valide et un mot de passe de 10 caractères minimum.'});
 const hash=await bcrypt.hash(password,12); const result=await pool.query('INSERT INTO users(email,password_hash,display_name) VALUES($1,$2,$3) RETURNING id,email,display_name',[normalized,hash,String(name).trim()]).catch(e=>{if(e.code==='23505') return null; throw e;});
 if(!result)return res.status(409).json({error:'Un compte existe déjà avec cet e-mail.'}); req.session.user={id:result.rows[0].id,name:result.rows[0].display_name,email:result.rows[0].email}; res.status(201).json({user:req.session.user});
}));
app.post('/api/auth/login',asyncRoute(async(req,res)=>{const email=String(req.body?.email||'').trim().toLowerCase();const result=await pool.query('SELECT id,email,password_hash,display_name FROM users WHERE email=$1',[email]);const user=result.rows[0];if(!user||!await bcrypt.compare(String(req.body?.password||''),user.password_hash))return res.status(401).json({error:'E-mail ou mot de passe incorrect.'});req.session.user={id:user.id,name:user.display_name,email:user.email};res.json({user:req.session.user});}));
app.post('/api/auth/logout',(req,res)=>req.session.destroy(err=>{if(err)return res.status(500).json({error:'Déconnexion impossible.'});res.clearCookie('connect.sid');res.json({ok:true});}));
app.get('/api/ranks',(_req,res)=>res.json({ranks}));
app.get('/api/matches',auth,asyncRoute(async(req,res)=>{const {rows}=await pool.query('SELECT * FROM tennis_matches WHERE user_id=$1 ORDER BY played_on DESC,id DESC',[req.session.user.id]);res.json(rows);}));
app.post('/api/matches',auth,saveMatch);
app.put('/api/matches/:id',auth,saveMatch);
async function saveMatch(req,res){const b=req.body||{};const training=b.match_type==='training';const formatKey=b.match_format;const allowedFormats=['best_of_3','best_of_3_super','best_of_5','best_of_5_super'];
 if(!['friendly','tournament','training'].includes(b.match_type)||!['singles','doubles'].includes(b.format)||!b.played_on||!b.venue||!b.surface||(!training&&!allowedFormats.includes(formatKey))||!Array.isArray(b.sets)||!b.sets.length||!Array.isArray(b.players)||b.players.length!==(b.format==='singles'?2:4)||!Number.isInteger(Number(b.duration_minutes))||Number(b.duration_minutes)<1||!Number.isInteger(Number(b.feeling))||Number(b.feeling)<1||Number(b.feeling)>10||b.match_type==='tournament'&&!b.tournament_round)return res.status(400).json({error:'Vérifiez le format du match, les joueurs, le score, la durée et le ressenti.'});
 if(b.players.some(p=>!String(p.first_name||p.name||'').trim()||!String(p.last_name||p.name||'').trim()||!ranks.includes(p.rank))||(b.format==='doubles'&&[1,2].some(t=>b.players.filter(p=>Number(p.team)===t).length!==2)))return res.status(400).json({error:'Renseignez le prénom, le nom, le classement FFT et deux joueurs par équipe en double.'});
 const sets=b.sets.map(s=>({...s,a:Number(s.a),b:Number(s.b),super:training?false:Boolean(s.super)}));
 if(sets.some(s=>!Number.isInteger(s.a)||!Number.isInteger(s.b)||s.a<0||s.b<0||(!training&&s.a===s.b)))return res.status(400).json({error:training?'Chaque manche doit contenir deux scores entiers positifs ou nuls.':'Chaque set officiel doit avoir deux scores différents.'});
 let winnerTeam=null;
 if(training){const a=sets.filter(s=>s.a>s.b).length,c=sets.filter(s=>s.b>s.a).length;winnerTeam=a===c?null:a>c?1:2;}
 else {
   const bestOf=formatKey.startsWith('best_of_3')?3:5, target=(bestOf+1)/2, hasSuper=formatKey.endsWith('_super');
   const maxSets=bestOf, wins=[0,0];let ended=false;
   for(let i=0;i<sets.length;i++){const s=sets[i],decisive=hasSuper&&i===maxSets-1;
     if(ended)return res.status(400).json({error:'La rencontre doit s’arrêter dès qu’une équipe atteint le nombre de sets gagnants.'});
     if(Boolean(s.super)!==decisive)return res.status(400).json({error:decisive?'Le dernier set doit être saisi comme un super tie-break.':'Seul le set décisif peut être un super tie-break.'});
     const hi=Math.max(s.a,s.b),lo=Math.min(s.a,s.b);
     const valid=decisive?(hi>=10&&hi-lo>=2):(hi===6&&lo<=4)||(hi===7&&(lo===5||lo===6));
     if(!valid)return res.status(400).json({error:decisive?'Le super tie-break se gagne à 10 points minimum avec 2 points d’écart.':'Score de set classique invalide. Un set se termine à 6 jeux avec 2 jeux d’écart, ou à 7-5/7-6.'});
     wins[s.a>s.b?0:1]++;if(wins[0]===target||wins[1]===target)ended=true;
   }
   if(sets.length<target||sets.length>maxSets||!ended)return res.status(400).json({error:'Le nombre de sets et le résultat ne correspondent pas au format de rencontre choisi.'});
   winnerTeam=wins[0]>wins[1]?1:2;
 }
 const players=b.players.map(p=>({first_name:String(p.first_name||p.name||'').trim().split(' ')[0],last_name:String(p.last_name||p.name||'').trim().split(' ').slice(1).join(' '),rank:p.rank,team:Number(p.team)}));
 const userId=req.session.user.id, params=[userId,b.match_type,b.format,b.played_on,b.venue,b.surface,training?'custom':formatKey,b.tournament_round||null,Number(b.duration_minutes),Number(b.feeling),winnerTeam,JSON.stringify(players),JSON.stringify(sets)];
 const sql=`${req.method==='POST'?'INSERT INTO tennis_matches(user_id,match_type,format,played_on,venue,surface,match_format,tournament_round,duration_minutes,feeling,winner_team,players,sets) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb) RETURNING *':'UPDATE tennis_matches SET match_type=$2,format=$3,played_on=$4,venue=$5,surface=$6,match_format=$7,tournament_round=$8,duration_minutes=$9,feeling=$10,winner_team=$11,players=$12::jsonb,sets=$13::jsonb WHERE user_id=$1 AND id=$14 RETURNING *'}`;
 const result=await pool.query(sql,req.method==='POST'?params:[...params,req.params.id]);if(!result.rowCount)return res.status(404).json({error:'Match introuvable.'});res.status(req.method==='POST'?201:200).json(result.rows[0]);}
app.delete('/api/matches/:id',auth,asyncRoute(async(req,res)=>{const r=await pool.query('DELETE FROM tennis_matches WHERE id=$1 AND user_id=$2',[req.params.id,req.session.user.id]);res.status(r.rowCount?204:404).end();}));
app.get('/api/appointments',auth,asyncRoute(async(req,res)=>{const {rows}=await pool.query('SELECT * FROM appointments WHERE user_id=$1 ORDER BY match_date,match_time',[req.session.user.id]);res.json(rows);}));
app.post('/api/appointments',auth,appointment);
app.put('/api/appointments/:id',auth,appointment);
async function appointment(req,res){const b=req.body||{};if(!b.match_date||!b.match_time||!b.venue||!b.opponent||b.opponent_rank&&!ranks.includes(b.opponent_rank))return res.status(400).json({error:'Renseignez la date, l’heure, le lieu et l’adversaire. Vérifiez le classement.'});const p=[req.session.user.id,b.match_date,b.match_time,b.venue,b.opponent,b.opponent_rank||null];const sql=req.method==='POST'?'INSERT INTO appointments(user_id,match_date,match_time,venue,opponent,opponent_rank) VALUES($1,$2,$3,$4,$5,$6) RETURNING *':'UPDATE appointments SET match_date=$2,match_time=$3,venue=$4,opponent=$5,opponent_rank=$6 WHERE user_id=$1 AND id=$7 RETURNING *';const r=await pool.query(sql,req.method==='POST'?p:[...p,req.params.id]);if(!r.rowCount)return res.status(404).json({error:'Rendez-vous introuvable.'});res.status(req.method==='POST'?201:200).json(r.rows[0]);}
app.delete('/api/appointments/:id',auth,asyncRoute(async(req,res)=>{const r=await pool.query('DELETE FROM appointments WHERE id=$1 AND user_id=$2',[req.params.id,req.session.user.id]);res.status(r.rowCount?204:404).end();}));
const dist=path.resolve(__dirname,'../dist');app.use(express.static(dist));app.get('*',(req,res,next)=>req.path.startsWith('/api/')?next():res.sendFile(path.join(dist,'index.html')));
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:'Une erreur est survenue. Réessayez.'});});
await initDb();const port=Number(process.env.PORT)||3000;app.listen(port,'0.0.0.0',()=>console.log(`Matchpoint prêt sur le port ${port}`));
