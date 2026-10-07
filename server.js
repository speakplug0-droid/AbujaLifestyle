const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const players = new Map();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req,res)=>{
  try{
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    let pathname = decodeURIComponent(url.pathname);
    if(pathname === "/") pathname = "/index.html";
    const file = path.resolve(ROOT, "." + pathname);
    if(!file.startsWith(ROOT + path.sep)){
      res.writeHead(403); res.end("Forbidden"); return;
    }
    fs.readFile(file,(err,data)=>{
      if(err){ res.writeHead(404,{"Content-Type":"text/plain"}); res.end("Not found"); return; }
      res.writeHead(200,{
        "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control":"no-cache"
      });
      res.end(data);
    });
  }catch{
    res.writeHead(500); res.end("Server error");
  }
});

const wss = new WebSocket.Server({server});

wss.on("connection",(socket)=>{
  const id = Math.random().toString(36).slice(2,10);
  players.set(id,{x:0,z:8,rotation:0,name:"Player",faction:"Civilian"});

  socket.send(JSON.stringify({type:"welcome",id}));

  socket.on("message",(raw)=>{
    try{
      const data=JSON.parse(raw);
      const p=players.get(id);
      if(!p) return;
      if(data.type==="position"){
        p.x=Number(data.x)||0;
        p.z=Number(data.z)||0;
        p.rotation=Number(data.rotation)||0;
      }
      if(data.type==="profile"){
        if(typeof data.name==="string") p.name=data.name.slice(0,20);
        if(typeof data.faction==="string") p.faction=data.faction.slice(0,24);
      }
    }catch{}
  });

  socket.on("close",()=>players.delete(id));
});

setInterval(()=>{
  const packet=JSON.stringify({type:"players",players:Object.fromEntries(players)});
  for(const socket of wss.clients){
    if(socket.readyState===WebSocket.OPEN) socket.send(packet);
  }
},100);

server.listen(PORT,()=>console.log("AbujaLifestyle server running on "+PORT));
