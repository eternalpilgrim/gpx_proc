let files_input = document.getElementById("gpx-files"),
	routes_table = document.getElementById("routes-table-tbody"),
	
	gpx_objects = [];

class TrkPoint{
	constructor(lat, lon, ele,t){
		this.lat = lat;
		this.lon = lon;
		this.ele = ele;
		this.time = t;
	}
}

class GPXObject{
	constructor(name){
		this.name = name;
		this.trksegs = [];
	}
}

const EARTH_RADIUS_IN_METERS = 6371000;
const toRad = value => value * Math.PI / 180;

// вычисление расстояния между двумя точками по формуле гаверсинусов
const calculateDistance = (startWaypoint, endWaypoint) => {

  const dLat = toRad(endWaypoint.lat - startWaypoint.lat);
  const dLon = toRad(endWaypoint.lon - startWaypoint.lon);

  const startLat = toRad(startWaypoint.lat);
  const endLat = toRad(endWaypoint.lat);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(startLat) * Math.cos(endLat);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_IN_METERS * c;
};



function parseGPXFile(file){
	return new Promise(resolve=>{
		let parser, xml_doc, reader, gpx_obj;
	
		reader = new FileReader();
		reader.readAsText(file);
	
		reader.onload = function() {
			parser = new DOMParser();
			xml_doc = parser.parseFromString(reader.result,"text/xml");
		
			let metadata_xml = xml_doc.querySelector('metadata');
			
			gpx_obj = new GPXObject(metadata_xml.querySelector("name").childNodes[0].nodeValue);
			
			let trks_xml = xml_doc.querySelectorAll("trk");
			trks_xml.forEach((trk)=>{
				trk.querySelectorAll("trkseg").forEach((trkseg)=>{
					let points = [];
					trkseg.querySelectorAll("trkpt").forEach((trkpt)=>{
						points.push(new TrkPoint(trkpt.getAttribute("lat"),
												 trkpt.getAttribute("lon"),
												 trkpt.querySelector("ele").childNodes[0].nodeValue,
												 trkpt.querySelector("time").childNodes[0].nodeValue
												));	
					})
					
					gpx_obj.trksegs.push(points);
				})
			
			})
		
			resolve(gpx_obj);
			//gpx_objects.push(gpx_obj);
  		};	
	});
}


files_input.addEventListener("change", async function(event) {
	//считывание данных из файлов в gpx_objects
	gpx_objects.length = 0;
	for (let i=0; i < files_input.files.length; i++) {
		gpx_objects.push(await parseGPXFile(files_input.files[i]));
    }
	
	//console.log(gpx_objects);
	
	// обработка gpx_objects: расчёт расстояния, скорости и заполнение таблицы этими данными
	let total_dist = 0;
	gpx_objects.forEach((route)=>{
		let new_tr = document.createElement("tr"),	
			new_name = document.createElement("td"),
			new_dist = document.createElement("td"),
			new_time = document.createElement("td"),
			new_vel = document.createElement("td");
		new_name.innerHTML = route.name;
		new_tr.appendChild(new_name);
		
		let trk_dist = 0, trk_time=0;
		route.trksegs.forEach((trkseg)=>{
			if (trkseg.length > 1)
			{
				for(let i =0; i<(trkseg.length-1);i++){
					trk_dist += calculateDistance(trkseg[i],trkseg[i+1]);
				}
				trk_time += Date.parse(trkseg[trkseg.length-1].time) - Date.parse(trkseg[0].time);
			}
		})
		total_dist += trk_dist;
		
		new_dist.innerHTML = (trk_dist/1000).toFixed(2);	
		new_tr.appendChild(new_dist);
		
		let hours = trk_time/3600000;
		new_time.innerHTML = Math.trunc(hours)+" ч "+ ((hours % 1)*60).toFixed(0) +" мин";
		new_tr.appendChild(new_time);
		
		new_vel.innerHTML = (trk_dist/1000/hours).toFixed(1);
		new_tr.appendChild(new_vel);
		
		routes_table.appendChild(new_tr);	
	})
	document.getElementById("total-dist").innerHTML = "Общая дистанция: "+(total_dist/1000).toFixed(2)+" км";
}, false);


