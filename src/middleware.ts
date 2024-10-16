import { getToken } from 'next-auth/jwt';
import { withAuth} from 'next-auth/middleware' ;
import { NextResponse } from 'next/server';

export default withAuth(
    async function middleware(req){
        const pathname = req.nextUrl.pathname;

        //route protection
        const isAuth = await getToken({req});
        const isLoginPage = pathname.startsWith('/login');

        const sensitiveRoutes = ['/dashboard'] ;
        const isAccessingSensitiveRoute = sensitiveRoutes.some((route)=> pathname.startsWith(route));
        
        if(isLoginPage){
            if(isAuth){
                return NextResponse.redirect(new URL('/dashboard',req.url));
            }
            return NextResponse.next();
        }

        if(!isAuth && isAccessingSensitiveRoute){
            return NextResponse.redirect(new URL('/login', req.url));
        }

        if(pathname==='/'){
            return NextResponse.redirect(new URL('/dashboard',req.url));
        }
    },{
        //this is specifically for nextAuth middleware so that the middleware function above is always called because if we dont have this callback we will have to call the middleware function in every route and this will lead infinite redirection and the page will never load.
        callbacks:{
            async authorized(){
                return true;
            }
        }
    }
)

export const config = {
     matchter:['/','/login','/dashboard/:path*'],
}