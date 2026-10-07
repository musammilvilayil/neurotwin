import jwt from 'jsonwebtoken';
export const sign=(user)=>jwt.sign({id:user._id,role:user.role,name:user.name},process.env.JWT_SECRET||'development-only-secret',{expiresIn:'8h'});
export const authenticate=(req,res,next)=>{try{const token=req.headers.authorization?.replace('Bearer ',''); if(!token) throw Error(); req.user=jwt.verify(token,process.env.JWT_SECRET||'development-only-secret'); next()}catch{res.status(401).json({error:'Authentication required'})}};
export const allow=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'Insufficient role'})
