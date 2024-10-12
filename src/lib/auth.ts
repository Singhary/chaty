import { NextAuthOptions } from "next-auth";
import { UpstashRedisAdapter } from "@next-auth/upstash-redis-adapter";
import { db } from "./db";
import GoogleProvider from "next-auth/providers/google";

function getGoogleCrediential(){
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if(!clientId || !clientSecret){
        throw new Error('Google client id or client secret is missing');
    }
    return{
        clientId,
        clientSecret,
    };
}


export const authOptions:NextAuthOptions = {
    adapter:UpstashRedisAdapter(db),
    session:{
        strategy:'jwt',
    },
    pages:{
        signIn:'/login',
    },
    providers:[
        GoogleProvider({
            clientId:getGoogleCrediential().clientId,
            clientSecret:getGoogleCrediential().clientSecret,
        }),
    ],
    callbacks:{
        async jwt({token , user}){
            const dbUser = (await db.get(`user:${token.id}`)) as User | null ;

            if(!dbUser){
                 token.id = user!.id;
                 return token;
            }
            
            return{
                id:dbUser.id,
                name:dbUser.name,
                email:dbUser.email,
                image:dbUser.image,
            }
        },
        async session({session , token}){
            if(token){
                session.user.id = token.id;
                session.user.name = token.name;
                session.user.email = token.email;
                session.user.image = token.image as string;
            }
            return session;
        },
        redirect(){
            return '/dashboard';
        },
    },

}