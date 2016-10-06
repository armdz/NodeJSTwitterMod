var	APP_NAME = "Twitter Mod v.01";
//	includes
var Twitter = require("twitter");
var	JsonFile = require("jsonfile");
var QueryString = require('querystring');	//	encodear para url
var fs = require('fs');
var DownloadQueue = require("./download_queue.js");
//	
var output_dir_path = "output";
var output_file_path = "/data.json";
var project_name = "";
var	twitter_client = null;
var download_queue = null;
var hash_tags = "";
var search_interval = 0;
var search_quantity = 0;
var search_lang = "";
var search_last_id = "";
var tweets_data = [];
var timer_search = null;
//	inicia

load_config();

//	

function	load_config()
{
	if(process.argv.length > 2)
	{
		project_name = process.argv[2];
		output_file_path = "./output/" + project_name + output_file_path;
	}else{
		log("Hace falta un nombre de proyecto.",true);
		return;
	}
	
	console.log(APP_NAME);
	JsonFile.spaces = 4;
	JsonFile.readFile("config/config.json",function(error,data)
	{
		if(error != null)
		{
			//	load ok
			log("No se encuentra el archivo config.json",true);
		}else{
			//	load error
			log("Configuración OK");
			twitter_client = new Twitter(data.api);
			log("Hashtags");
			for(var hastag_index in data.search.hashtags)
			{
				log("#"+data.search.hashtags[hastag_index]);
				hash_tags+=data.search.hashtags[hastag_index] + (hastag_index < data.search.hashtags.length-1 ? " OR " : "");
			}
			hash_tags = QueryString.escape(hash_tags);
			search_quantity = data.search.quantity;
			search_lang = data.search.language;
			search_interval = data.search.time;
			start();
		}
	});
}

//	inicia le proceso :)

function	start()
{
	log(hash_tags);

	var date = new Date();
	download_data = new DownloadQueue(callback_end_queue);
	do_search();
}

//	realiza la busqueda

function	do_search()
{
	log("Iniciando búsqueda ... ");
	twitter_client.get("search/tweets",{
		q: hash_tags,
		count: search_quantity,
		since_id: search_last_id,
		lang: search_lang
	},function(error,tweets,response)
	{
		if(error != null)
		{
			log("No se pudo realizar la búsqueda",true);
		}else{
			search_last_id = tweets.search_metadata.max_id_str;
			log("Búsqueda OK");
			log("Actualización LAST_ID = " + search_last_id);
			tweets_data = [];
			for(var tweet_index in tweets.statuses)
			{
				var current_tweet = tweets.statuses[tweet_index];
				var tweet_obj = build_tweet(current_tweet);
				tweets_data.push(tweet_obj);
			}
			download_data.download(project_name,tweets_data);
		}
	});
}

//	termino de bajar imagenes, guarda el json 

function	callback_end_queue()
{
	var output_data = [];
	fs.exists(output_file_path,function(exists)
	{
		if(exists)
		{
			JsonFile.readFile(output_file_path,function(error,data)
			{
				if(error == null)
				{
					output_data = data;
					log("Archivo data.json existe con " + output_data.length + " tweets.");
					save(output_data);
				}else{
					log("Problemas abriendo data.json",true);
				}
			});
		}else{
			save(output_data);
		}
	});
	
}

function	save(output_data)
{
	var total_new = 0;
	for(var t in tweets_data)
	{
		output_data.push(tweets_data[t]);
		total_new++;
	}
	log("Se agregaron " + total_new + " tweets");

	JsonFile.writeFile(output_file_path, output_data, function (err) {
	    if(err)
	    {
	      	log("Problemas salvando el JSON",true);
	    }else{
	    	time_to_next_search();
	    }
	 });	
}

//	una vez guardado el json, prepara la próxima búsqueda

function	time_to_next_search()
{
	log("Próxima búsqueda en " + search_interval + " minutos.");
	timer_search = setTimeout(function(){
		do_search();
	},(60000)*search_interval);
}

//	construye le objeto de twit

function	build_tweet(obj)
{
	var media = "";
	if(obj.entities.media != undefined)
	{
		if(obj.entities.media.length > 0)
		{
			media = obj.entities.media[0].media_url;
		}
	}
	var ret = {
		"screen_name":obj.user.screen_name,
		"name":obj.user.name,
		"text":obj.text,
		"profile_image":obj.user.profile_image_url,
		"media":media,
		"local_media": "",
		"local_profile":""
	};
	return ret;
}

function	log(str,error)
{
	var datetime = new Date(new Date()).toString().split(' ')[4];
	console.log("[" + datetime + "] >> " + (error ? "(ERROR) : " : "") + str);
}