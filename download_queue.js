var fs = require("fs");
var request = require("request");
var	JsonFile = require("jsonfile");

function DownloadQueue (_callback_end) {

	const FILE_TYPE_PROFILE = 0;
	const FILE_TYPE_MEDIA = 1;
	var PATH_PROFILE = "/profile/";
	var PATH_MEDIA = "/media/"
	var tweet_data = null;
	var	tweet_index = 0;
	var download_moment = 0;
	var callback_end = null;
	var project_name = "";
	this.first_time = true;


	DownloadQueue.prototype.download = function(project_name,tweet_data)
	{
		this.project_name = project_name;
		this.tweet_data = tweet_data;
		this.tweet_index = 0;
		this.download_moment = FILE_TYPE_PROFILE;
		this.callback_end = _callback_end;
		if(this.first_time){
			this.first_time = false;
			if (!fs.existsSync("./output")){
				fs.mkdirSync("./output");
			}
			this.project_name = "./output/"+this.project_name;
			if (!fs.existsSync("./"+this.project_name)){
				fs.mkdirSync("./"+this.project_name);
			}
			PATH_PROFILE = "./"+this.project_name+PATH_PROFILE;
			if (!fs.existsSync(PATH_PROFILE)){
				fs.mkdirSync(PATH_PROFILE);
			}
			PATH_MEDIA = "./"+this.project_name+PATH_MEDIA;
			if (!fs.existsSync(PATH_MEDIA)){
				fs.mkdirSync(PATH_MEDIA);
			}
		}
		this.do_download();

	};

	DownloadQueue.prototype.do_download = function()
	{
		this.download_file(this.tweet_data[this.tweet_index],this.download_moment);		
	};

	DownloadQueue.prototype.check_queue_status = function() {
		if(this.tweet_index > this.tweet_data.length-1)
		{
			this.callback_end();
		}else{
			this.download_moment = FILE_TYPE_PROFILE;
			this.do_download();
		}
	};

	DownloadQueue.prototype.download_file = function(data,type)
	{
		var online_path = "";
		var local_path = "";

		if(type == FILE_TYPE_PROFILE)
		{
			online_path = data.profile_image;
			online_path = online_path.replace("_normal","");
			local_path = PATH_PROFILE;
		}else if(type == FILE_TYPE_MEDIA)
		{
			online_path = data.media;	
			local_path = PATH_MEDIA;
		}
		
		var	file_name = online_path.split("/")[online_path.split("/").length-1];
		local_path+=file_name;
		var file_output = fs.createWriteStream(local_path);
		
		request(online_path)
		.pipe(file_output)
		.on('error', function(error){
		    if(error != null)
		    {
		    	log("No pude descargar " + online_path,true);
		    	this.next_profile(true);
		    }
		});

		var parent = this;

		file_output.on('close',function()
		{
			if(type == FILE_TYPE_PROFILE){	
	    		data.local_profile = file_name;
	    		if(data.media != "")
	    		{
	    			parent.download_moment = FILE_TYPE_MEDIA;
	    			parent.do_download();
	    		}else{
	    			parent.next_profile(false);
	    		}
		    }else if(type == FILE_TYPE_MEDIA)
		    {
		    	data.local_media = file_name;
		    	parent.next_profile(false);
		    }
		});

	};

	DownloadQueue.prototype.next_profile = function(error)
	{
		var download_count_str = " (" + (this.tweet_index+1) + " / " + this.tweet_data.length + ")"; 
		if(!error)
		{
			this.log("Download [OK] " + this.tweet_data[this.tweet_index].screen_name + download_count_str);
		}else{
			this.log("Download " + this.tweet_data[this.tweet_index].screen_name + download_count_str,true);
		}
		this.tweet_index++;
		this.check_queue_status();
	}	

	DownloadQueue.prototype.log = function(str,error)
	{
		var datetime = new Date(new Date()).toString().split(' ')[4];
		console.log("[" + datetime + "]	>> " + (error ? "(ERROR) : " : "") + str);
	}

}

module.exports = DownloadQueue;