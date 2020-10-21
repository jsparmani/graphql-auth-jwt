import {Response} from 'express'

export const sendRefreshToken = (res:Response, token: string) => {
    res.cookie("jid", token, {httpOnly: true, maxAge: 604800*1000})
}