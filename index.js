const http = require('http');
const { url, URLSearchParams } = require('url');
const fs = require('fs');
const path = require('path');
const port = process.argv[2] || 9000;
let params;
//원본 폴더와 파일들을 전부 결합해
//가상 파인더를 만들기

//CurrentDir, Focus
//if front -> front folders only
//in front folder -> get real subfolders

//first
//client -> 프론트 주세요
//조건 : url에 아무것도 없을경우

//client -> server 원하는 폴더 안의 내용
//client <- server ( ok, 전송 )
//client -> server 

// Request 구조
	// (front folder)/subfolder/subfolder/file.exe
	// replace front folder to real adress
	// verify these
	// send

var folderlist = {};
function __log(info,text)
{
	console.log('['+info+'] ' + text);
}
function syncafter(res)
{
	res.write(`</body>`);
	res.end();
}

var settings = JSON.parse(fs.readFileSync('server.cfg', 'utf8'));
if(settings)
{
	folderlist = settings;
	__log('info','Loaded Settings');
}
const server = http.createServer(function (request, response) 
{
	__log('Network', `${request.method} ${request.url} from ${request.connection.remoteAddress}`);
    //console.log('request ', request.url, ' from', request.connection.remoteAddress);
	var rq = request.url.split('/');
	var par = request.url.split('?');
	__log('dev', 'got ' + rq[1] + ' is ' + folderlist[rq[1]]);
	params = new URLSearchParams(par[1]);
	__log('dev', rq.length);
	var files = [];
	var directories = [];
	
	if (folderlist[rq[1]]) //verify it's shared main folder
	{
		fs.exists(folderlist[rq[1]], (exists) => //main folder is exists?
		{
			if(exists) 
			{
				var ad = folderlist[rq[1]] //join rest folder
				for(var rest=2;rest<rq.length;rest++) 
				{
					ad = path.join(ad, rq[rest]);
				}
				__log('dev',ad);
				fs.exists(ad, (ex) =>  //is exist?
				{
					if(ex) 
					{ 
						var vaild = fs.statSync(ad)
						if(vaild.isDirectory()) //is directory?
						{ //send list
							__log('Network', `List Sending - ${ad} - ${request.connection.remoteAddress}`);
							response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
							response.write(`<body>`);
							fs.readdir(ad, (err, __files) => 
							{
								for(var i=0; i<__files.length; i++) 
								{
									var finalres = path.join(ad, __files[i]);
									var stats = fs.statSync(finalres)
									if (stats.isDirectory())
									{
										response.write(`dir: ${__files[i]}<br>`);
										directories.push(__files[i]);
									}
									else 
									{
										response.write(`file: ${__files[i]}<br>`);
										files.push(__files[i]);
									}
								}
								syncafter(response); //sync end of response
							});
						}
						else if(vaild.isFile()) //is File?
						{
							sendFile(ad, response);
							__log('Network', `File Sent - ${ad} - ${request.connection.remoteAddress}`);
						}
						else //it's not vaild
						{
							response.statusCode = 404;
							response.end(`Error - Not Vaild!`);
							__log('error', `Not Vaild - File/Folder was not vaild(Not a folder, Not a file) - ${request.connection.remoteAddress}`);
						}
					}
					else
					{
						response.statusCode = 404;
						response.end(`Error - Not Real Directory!`);
						__log('error', `Not Real Directory - Given address was not exists - ${request.connection.remoteAddress}`);
					}
				});
			}
			else
			{
				response.statusCode = 404;
				response.end(`Error - Not Real Directory!`);
				__log('error', `Not Real Directory - Shared folder was not exist - ${request.connection.remoteAddress}`);
			}
		});
	}
	else 
	{
		response.statusCode = 404;
		response.end(`Error - No such folder!`);
		__log('error', `No such folder - It's not shared - ${request.connection.remoteAddress}`);
	}
}).listen(parseInt(port));
__log('info', `Server listening on port ${port}`);

function sendFile(address, response)
{ //https://stackoverflow.com/questions/16333790/node-js-quick-file-server-static-files-over-http
	__log('dev',address);
	var pathname = address;
	// based on the URL path, extract the file extention. e.g. .js, .doc, ...
	const ext = path.extname(pathname);
	// maps file extention to MIME typere
	const map = {
		'.ico': 'image/x-icon',
		'.html': 'text/html',
		'.js': 'text/javascript',
		'.json': 'application/json',
		'.css': 'text/css',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.wav': 'audio/wav',
		'.mp3': 'audio/mpeg',
		'.svg': 'image/svg+xml',
		'.pdf': 'application/pdf',
		'.doc': 'application/msword'
	};

	fs.exists(pathname, function (exist) {
		if(!exist) {
			// if the file is not found, return 404
			response.statusCode = 404;
			response.end(`Error : File ${pathname} not found!`);
			return;
		}

		// if is a directory search for index file matching the extention
		if (fs.statSync(pathname).isDirectory()) pathname += '/index' + ext;

		// read file from file system
		fs.readFile(pathname, function(err, data){
			if(err){
				response.statusCode = 500;
				response.end(`Error : Error getting the file: ${err}.`);
			} else {
			// if the file is found, set Content-type and send data
				response.setHeader('Content-type', map[ext] || 'text/plain' );
				response.end(data);
			}
		});
	});
}

var stdin = process.openStdin();
stdin.addListener("data", function(d) { //input
	var get = d.toString().trim().split(" ");
	if (get[0] == "add")
		{
		if (get[1] == null || get[2] == null) 
		{
			__log('error','It\'s not vaild value.')
		}
		else 
		{
			folderlist[get[2]] = get[1]; //fake : real
			__log('info',`${get[1]} Was shared to ${get[2]}`)
		}
	}
	if (get[0] == "del")
	{
		for(var folder in folderlist)
		{
			__log('info',folder, folder.keys);
		}
		
		if(folderlist[get[1]])
		{
			delete folderlist[get[1]]; //undefined? delete?
			__log('alert',`${get[0]} was deleted`);
		}
		else
		{
			__log('alert',`${get[0]} was not exist`);
		}
	}
	if (get[0] == "get")
	{
		for(var folder in folderlist)
		{
			__log('info',folder, folder.keys);
		}
	}
	if (get[0] == "sav")
	{
		var stream = fs.createWriteStream("server.cfg");
		stream.once('open', function(fd) {
			stream.write(JSON.stringify(folderlist));
			stream.end();
		});
		__log('info','Saved');
	}
	if (get[0] == "lod")
	{
		
	}
 });