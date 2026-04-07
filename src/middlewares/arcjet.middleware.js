import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";


export const arcjetProtection = async (req, res, next) => {
    try{

        const decision = await aj.protect(req);

        if(decision.isDenied()){
            if(decision.reason.isRateLimit()){
                return res.status(429).json({message:"Rate limit exceeded, try again later"});
            }else if(decision.reason.isBot()){
                return res.status(403).json({message:"Bot access denied"});
            }else{
                return res.status(403).json({message:"Access Denied by security Policy"});
            }
        }

        //check for spoofed bots(bots which acts as human , but they are not)
        if(decision.results.some(isSpoofedBot)){
            return res.status(403).json({
                error:"Spoofed Bot detected",
                message:"Malicious bot activity Detected"
            })
        }

        next();
        
    }
    catch(err){
        console.log("Arcjet Protection error",err);
        return res.status(500).json({
        message: "Security check failed"
    });
    }

}