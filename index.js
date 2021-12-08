const { getLocal } = require("mockttp");
const https = require("https");
const metachar = require("metacharacter");

const mockServer = getLocal();

mockServer.start(3333).then(() => {
    console.log(`Proxy server started with port ${mockServer.port}`);
    let username = "";
    let isOptifine = false;
    mockServer.anyRequest().thenPassThrough({
        beforeRequest: (req) => {
            if(req.url.includes("s.optifine.net")){
                isOptifine = true;
                username = req.url.split("/")[4].replace(".png", "");
            }else{
                isOptifine = false;
            }
        },
        beforeResponse: async(res) => {
            if(!isOptifine){
                return{
                    body: "You cannot use the proxy on servers other than the Optifine server",
                    headers: {
                        "content-type": "text/html",
                        "Connection": "close",
                    }
                }
            }

            let cape = await getCape("https://minecraftcapes.net/api/user/" + username);

            if(cape == "failed"){
                return{
                    headers: {
                      "Transfer-Encoding": "chunked",
                      "Connection": "close",
                    }
                  }
            }

            let buffer = new Buffer.from(cape, "base64");
            return{
                body: buffer,
                headers: {
                    "Transfer-Encoding": "chunked",
                    "Connection": "close",
                }
            }
        }
    });
});

mockServer.on("request", (req) => {
    if(!req.url.includes("s.optifine.net/capes") || req.url.includes("cfg")) return;
    console.log(req.url)
    const username = req.url.split("/")[4].replace(".png", "");
    console.log(`Cape is requested for ${username}`);
});

function getCape(url){
    return new Promise((res, rej) => {
        if(url.includes("cfg")) return res("failed");
            https.get(url, (resp) => {
                let rawData = "";
                resp.on("data", (chunk) => { rawData += chunk });
                resp.on("end", () => {
                    console.log(rawData)
                    let json = JSON.parse(rawData);
                    if(typeof json.success != "undefined") return res("failed");
                    if(json.profile.textures.cape == null) return res("failed");
                    res(metachar.parse(json.profile.textures.cape))
                });
        });
    });
}