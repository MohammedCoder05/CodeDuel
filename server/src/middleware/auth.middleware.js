import jwt from "jsonwebtoken";

export function protect(req, res, next) {
    try {
        const token = req.cookies.token

        if(!token){
            return res.status(401).json( {message: "token not found"})
        }

        const decoded = jwt.verify(token,process.env.JWT_SECRET)

        const id = decoded.id
        req.id = id
        next()
    } catch (error) {
        return res.status(401).json({ message: "token invalid" })
    }
}