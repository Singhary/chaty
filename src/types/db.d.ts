interface User{
    name:string;
    email:string;
    image:string;
    id:string;
}

interface Chat{
    id:string;
    messages:Messages[];

}

interface Message{
    id:string;
    senderId:string;
    receiverId:string;
    text:string;
    timestamp:number;
}

interface FreindRequest{
    id:string;
    senderId:string;
    receiverId:string;

} 