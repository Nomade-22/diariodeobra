"use client";
import NextLink from "next/link";
import {useRouter,useParams as useNextParams,useSearchParams as useNextSearchParams,usePathname} from "next/navigation";
import type {ComponentProps,ReactNode} from "react";
type LinkProps=Omit<ComponentProps<typeof NextLink>,"href">&{to?:string;href?:string;state?:unknown};
export function Link({to,href,children,state:_state,...rest}:LinkProps){return <NextLink href={href??to??"#"} {...rest}>{children}</NextLink>;}
export function useNavigate(){const router=useRouter();return(path:string|number,opts?:{replace?:boolean})=>{if(typeof path==="number"){if(typeof window!=="undefined")window.history.go(path);return;}if(opts?.replace)router.replace(path);else router.push(path);};}
export function useParams<T extends Record<string,string>=Record<string,string>>():T{return(useNextParams()??{}) as T;}
export function useLocation(){const pathname=usePathname();const params=useNextSearchParams();return{pathname:pathname??"/",search:params?.toString()?`?${params.toString()}`:"",hash:typeof window!=="undefined"?window.location.hash:"",state:null};}
export function BrowserRouter({children}:{children:ReactNode}){return <>{children}</>;}export function Routes({children}:{children:ReactNode}){return <>{children}</>;}export function Route(_props:{path?:string;element?:ReactNode}){return null;}export function Navigate({to}:{to:string;replace?:boolean;state?:unknown}){if(typeof window!=="undefined")window.location.href=to;return null;}export function Outlet(){return null;}export{usePathname};
