var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";

var listOfCountries = [];
var recentDiseases = [];

function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}

function seznamUporabnikov()
{
	
	$("#seznamUporabnikov").append('<option value="3760de76-c6fb-4adf-bab7-af701004543a">Zorko Chen</option>');
	$("#seznamUporabnikov").append('<option value="63feb995-19bc-450f-99a7-0110ba3772a2">Jozefa Zhao</option>');
	$("#seznamUporabnikov").append('<option value="30d29261-0f7e-4ffc-9ed4-aa2b50621cae">Valburga Liang	</option>');
}

function kreirajEHR()  {
	sessionId = getSessionId();
	
	var ime = $("#ime").val();
	var priimek = $("#priimek").val();
	var datumRojstva = $("#datumRojstva").val();
	var casRojstva = $("#casRojstva").val();
	var spol = $('input:radio[name=gender]').filter(":checked").val();

	if (!ime || !priimek || !datumRojstva || !casRojstva || ime.trim().length == 0 || priimek.trim().length == 0 || datumRojstva.trim().length == 0 || casRojstva.trim().length == 0) {
		$("#sporociloVnosEHR").html("<span class='obvestilo label label-danger'>Izpolnite vsa polja!</span>");
		return false;
	}
	else
	{
		$.ajaxSetup({
		    headers: {"Ehr-Session": sessionId}
		});
		$.ajax({
		    url: baseUrl + "/ehr",
		    type: 'POST',
		    success: function (data) {
		        var ehrId = data.ehrId;
		        var partyData = {
		            firstNames: ime,
		            lastNames: priimek,
		            gender:spol + "",
		            dateOfBirth: datumRojstva+"T"+casRojstva,
		            partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
		        };
		        $.ajax({
		            url: baseUrl + "/demographics/party",
		            type: 'POST',
		            contentType: 'application/json',
		            data: JSON.stringify(partyData),
		            success: function (party) {
		                if (party.action == 'CREATE') {
		                    $("#obvestiloEHR").html('<div class="alert alert-success" role="alert">Uspešno kreiran EHR: ' + ehrId + '</div>');
		                    $("#ehrID").val(ehrId);
		                }
		                return true;
		            },
		            error: function(err) {
		            	$("#obvestiloEHR").html('<div class="alert alert-danger" role="alert"> Napaka pri ustvarjanju EHR: ' + JSON.parse(err.responseText).userMessage + "!");
		            	return false;
		            }
		        });
		    }
		});
	}
}

function preberiEHR() {
	sessionId = getSessionId();

	var ehrId = $("#pacientEHR").val();
	if (!ehrId || ehrId.trim().length == 0) $("#obvestiloEHR").html('<div class="alert alert-warning" role="alert"> Vnesite vse zahtevane podatke!</div>');
	else 
	{
		$.ajax({
			url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
			type: 'GET',
			headers: {"Ehr-Session": sessionId},
	    	success: function (data) {
				var podatki = data.party;
				var starost = getAge(podatki.dateOfBirth);
				var spol = podatki.gender == "MALE" ? "Moški" : "Ženska";
				$("#ime").html("<strong>" + podatki.firstNames + "</strong>");
				$("#priimek").html("<strong>" + podatki.lastNames + "</strong>");
				$("#spol").html("<strong>" + spol + "</strong>");
				$("#starost").html("<strong>" + starost + "</strong>");
				$("#obvestiloEHR").html("");
				$("#kartoteka").slideDown();
				$("#diagnoza").slideDown();
				preberiMeritve(ehrId);
				narisiGraf(ehrId);
			},
			error: function(err) {
				$("#obvestiloEHR").html('<div class="alert alert-danger" role="alert"> Napaka pri branju EHR: ' + JSON.parse(err.responseText).userMessage + "!");
				$("#kartoteka").hide();
			}
		});
	}
}

function vnosVitalnihPodatkov()
{
	sessionId = getSessionId();
	
	var ehrId = $("#pacientEHR").val();
	var temperatura = $("#temperatura").val();
	var teza = $("#teza").val();
	var visina = $("#visina").val();
	var tlak = $("#tlak").val().split("/");
	var merilec = $("#merilec").val();
	var datumMeritve = $("#datumMeritve").val();
	var casMeritve = $("#casMeritve").val();

	// Če merilec ni podan je to bolnik sam
	if (merilec.trim().length == 0 || !merilec) merilec = ehrId;

	var sistolicniTlak = tlak[0];
	var diastolicniTlak = tlak[1];


	if (!ehrId ||
	 !temperatura ||
	  !teza || 
	  !visina || 
	  !tlak || 
	  ehrId.trim().length == 0 || 
	  datumMeritve.trim().length == 0 || 
	  !datumMeritve || 
	  !casMeritve || 
	  casMeritve.trim().length == 0 || 
	  temperatura.trim().length == 0 || 
	  teza.trim().length == 0 || 
	  visina.trim().length == 0) {
		$("#sporociloVnosVitalnihPodatkov").html("<span class='obvestilo label label-danger'>Izpolnite vsa polja!</span>");
	}
	else {
		$.ajaxSetup({
		    headers: {"Ehr-Session": sessionId}
		});

		var podatki = {
		    "ctx/language": "en",
		    "ctx/territory": "SI",
		    "ctx/time": datumMeritve+"T"+casMeritve,
		    "vital_signs/height_length/any_event/body_height_length": visina,
		    "vital_signs/body_weight/any_event/body_weight": teza,
		   	"vital_signs/body_temperature/any_event/temperature|magnitude": temperatura,
		    "vital_signs/body_temperature/any_event/temperature|unit": "°C",
		    "vital_signs/blood_pressure/any_event/systolic": sistolicniTlak,
		    "vital_signs/blood_pressure/any_event/diastolic": diastolicniTlak
		};

		var parametri = {
		    "ehrId": ehrId,
		    templateId: 'Vital Signs',
		    format: 'FLAT',
		    committer: merilec
		};
		$.ajax({
		    url: baseUrl + "/composition?" + $.param(parametri),
		    type: 'POST',
		    contentType: 'application/json',
		    data: JSON.stringify(podatki),
		    success: function (res) {
		        $("#obvestiloVitalnihZnakov").html('<div class="alert alert-success" role="alert">Meritve so bile uspešno vnesene</div>');
		    },
		    error: function(err) {
		    	$("#obvestiloVitalnihZnakov").html('<div class="alert alert-danger" role="alert"> Napaka pri branju EHR: ' + JSON.parse(err.responseText).userMessage + "!");
		    }
		});
	}
}

function preberiMeritve(ehrId)
{
	sessionId = getSessionId();	

	var AQL = 
			"select " +
		    " a_a/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude as temperatura, "+
		    " a_d/data[at0001]/events[at0006]/data[at0003]/items[at0004]/value/magnitude as sis_tlak, "+
		    " a_d/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value/magnitude as dias_tlak, "+
		    " a_b/data[at0002]/events[at0003]/data[at0001]/items[at0004, 'Body weight']/value/magnitude as teza, "+
		    " a_c/data[at0001]/events[at0002]/data[at0003]/items[at0004, 'Body Height/Length']/value/magnitude as visina "+
			" from EHR e[ehr_id/value='" + ehrId+ "'] "+
			" contains COMPOSITION a "+
			" contains ( "+
			    " OBSERVATION a_a[openEHR-EHR-OBSERVATION.body_temperature.v1] and "+
			    " OBSERVATION a_b[openEHR-EHR-OBSERVATION.body_weight.v1] and "+
			    " OBSERVATION a_c[openEHR-EHR-OBSERVATION.height.v1] and "+
			    " OBSERVATION a_d[openEHR-EHR-OBSERVATION.blood_pressure.v1]) "+
			" order by a/context/start_time desc "+
			" offset 0 limit 1 ";
		$.ajax({
		    url: baseUrl + "/query?" + $.param({"aql": AQL}),
		    type: 'GET',
		    headers: {"Ehr-Session": sessionId},
		    success: function (rezultatAQL) {
		    	if (rezultatAQL) {
		    		var poizvedba = rezultatAQL.resultSet;
		    		var rezultat = "";
					var ITM;
			        for (var i in poizvedba) {
			        		rezultat += "<div class='stanje ' id='vTemp'>Temperatura: <span class=''>" + poizvedba[i].temperatura + "</span> °C</div>";
			        		rezultat += "<div class='stanje' id='vSis'>Sistolični tlak: <span class=''>" + poizvedba[i].sis_tlak + "</span> mmHH</div>";
			        		rezultat += "<div class='stanje' id='vDias'>Diastolični tlak tlak: <span class=''>" + poizvedba[i].dias_tlak + "</span> mmHH</div>";
			        		rezultat += "<div class='stanje label-normalno' id='vTeza'>Telesna teža: <span class=''>" + poizvedba[i].teza + "</span> kg</div>";
			        		rezultat += "<div class='stanje label-normalno' id='vVisina'>Telesna višina: <span class=''>" + poizvedba[i].visina + "</span> cm</div>";
			        		ITM = poizvedba[i].teza/(poizvedba[i].visina*poizvedba[i].visina/10000);
							rezultat += "<div class='stanje' id='vITM'>Indeks telesne mase: <span class=''>" + ITM.toFixed(2) + "</span></div>";

			        }
					
					
					var status;
					if(ITM<18.4) status=1;
					else if(ITM>18.5 && ITM<24.9) status=0;
					else if(ITM>25.0 && ITM<29.9) status=1;
					else if(ITM>30.0 && ITM<34.9) status=2;
					else if(ITM>35.0 && ITM<39.9) status=3;
					else status=4;
					

			        // Pogoji
			        $("body").bind("DOMNodeInserted", function() {
			        

						   if (poizvedba[0].temperatura > 37.0 || poizvedba[0].temperatura<35.0 )
					        	$("#vTemp").addClass("label-opozorilo");
					       else $("#vTemp").addClass("label-normalno");
						   
						   if (poizvedba[0].sis_tlak > 180 || poizvedba[0].sis_tlak<100 )
					        	$("#vSis").addClass("label-opozorilo");
					       else $("#vSis").addClass("label-normalno");
						   
						   if (poizvedba[0].dias_tlak > 90 || poizvedba[0].dias_tlak<45 )
					        	$("#vDias").addClass("label-opozorilo");
					       else $("#vDias").addClass("label-normalno");
						   
						   if(status==0) $("#vITM").addClass("label-zelena");
						   if(status==1) $("#vITM").addClass("label-rumena");
						   if(status==2) $("#vITM").addClass("label-oranzna");
						   if(status==3) $("#vITM").addClass("label-opozorilo");
						   if(status==4) $("#vITM").addClass("label-opozorilo");
						   
						   
					});
					
					$("#postavidiagnozo").click(function(){
					analiziraj(poizvedba[0].temperatura,status);
					});
					
			        $("#podatkiMeritev").html(rezultat);
		    	} else {
		    		$("#podatkiMeritev").html("Ni podatkov!");
		    	}

		    },
		    error: function(err) {
				console.log(JSON.parse(err.responseText).userMessage);
		    }
		});
}

function analiziraj(temperatura,itm){
	var tezava1 = $('input:radio[name=prebava]').filter(":checked").val();
	var tezava2 = $('input:radio[name=utrujenost]').filter(":checked").val();
	var tezava3 = $('input:radio[name=bolecine]').filter(":checked").val();
	var tezava4 = $('input:radio[name=zelodec]').filter(":checked").val();
	var tezava5 = $('input:radio[name=glavobol]').filter(":checked").val();
	var bolehanje = $('#dnevi').val();
	
	var tezave = tezava1+tezava2+tezava3+tezava4+tezava5;
	var nevarnadrzava = $('#seznamDrzav :selected').index();
	
	var sporocilo;
	
	if(nevarnadrzava !=0 && tezave>=2 && temperatura>38)
		sporocilo = "Lahko bolehate za " + recentDiseases[nevarnadrzava]+ ". Čimprej se posvetujte z vašim osebnim zdravnkiom in pozorno spremljajte simptome.";
	else if(tezave>=3 && temperatura>38) {
		if(bolehanje<=4)
		sporocilo ="Svetujemo, da pocakate še nekaj dni. Če se stanje ne izboljša pojdite k osebnemu zdravniku.";
		else
		sporocilo ="Čimprej se posvetujte z vašim osebnim zdravnikom.";
	}
	else if(temperatura<37 && tezave<=2 && itm!=0 )
	sporocilo="Ste zdravi, dobro se spočijte in zaužite veliko vode. Vaš indeks telesne teže odstopa od povprečnega, zato so vaše težave lahko povezane z telesno težo. Če se simptomi nadaljujejo se posvetujte z vašim osebnim zdravnikom.";
	else 
	sporocilo="Ste popolnoma zdravi. Kar tako naprej.";
	
	
	$("#postavitevDiagnozeOpozorilo").hide();
	
	$("#rezultatDiagnoze").html(sporocilo);
}

function graf(podatki,sirina)
{
	var width = sirina ,barHeight = 30, height = 300;
	console.log(sirina);
	var x = d3.scale.linear().range([0, width]);
	var y = d3.scale.linear().range([0, height]);

	var chart = d3.select(".chart").attr("width", width);

	data = podatki;

	x.domain([0, d3.max(data, function(d) { return d.value; })]);
	y.domain([0, d3.max(data,function(d) {return d.date; })]);


	chart.attr("height", barHeight * data.length);

	var bar = chart.selectAll("g").data(data).enter().append("g").attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; });
	bar.append("rect").attr("width", function(d) { return x(d.value); }).attr("height", barHeight - 2);
	bar.append("text")
	  	.attr("x", "5px")
	  	.style("text-anchor","start")
		.attr("y", barHeight / 2)
		.text(function(d) { return d.date; });

	  bar.append("text")
	      .attr("x", function(d) { return x(d.value) - 15; })
	      .attr("y", barHeight / 2)
	      .attr("dy", ".35em")
	      .text(function(d) { return d.value + " °C"; });

	function type(d) {
	  d.value = +d.value;
	  return d;
	}
}

var data = [];
function narisiGraf(ehrID)
{
	sessionId = getSessionId();	

	var AQL = "select "+
	    " a_a/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude as temperatura, " +
	    " a/context/start_time/value as cas " +
		" from EHR e[ehr_id/value='"+ehrID+"'] "+
		" contains COMPOSITION a "+
		" contains OBSERVATION a_a[openEHR-EHR-OBSERVATION.body_temperature.v1] "+
		" order by a/context/start_time desc "+
		" offset 0 limit 6 ";

	$.ajax({
	    url: baseUrl + "/query?" + $.param({"aql": AQL}),
	    type: 'GET',
	    headers: {"Ehr-Session": sessionId},
	    success: function (rezultatAQL) {
	    	
	    	if (rezultatAQL) {
	    		var poizvedba = rezultatAQL.resultSet;
	    		var rezultat = []
		        for (var i in poizvedba) {
					data.push({ 
			        "date": (poizvedba[i].cas).toString().substring(0,16).replace("T"," "),
			        "value": (poizvedba[i].temperatura).toString(),
			    	});
		        }

				graf(data,$("#graf").width());

	    	} else {
	    		$("#grafTemperatur").html("Ni podatkov!");
	    	}

	    },
	    error: function(err) {
			console.log(JSON.parse(err.responseText).userMessage);
	    }
	});

}




function homeInit(pocisti)
{
	listOfCountries = [];
	recentDiseases = [];
	$("#seznamDrzav").html("");
	$("#trenutneBolezniSporocilo").html("");
		
	$.getJSON('http://whateverorigin.org/get?url=' + 
		encodeURIComponent('http://www.hpsc.ie/A-Z/Vectorborne/ViralHaemorrhagicFever/EndemicAreasandRecentOutbreaks/EndemicAreasListofdiseasesbycountry/') + 
		'&callback=?', function(data){

		htmlContent = $.parseHTML(data.contents);
		htmlContent = $(htmlContent).find(".column1").find("p:not(:last)");


		listOfCountries.push("Nisem potoval (v zadnjih 3 mesecih)");
		recentDiseases.push("");
		$(htmlContent).each(function(index,result){
			listOfCountries.push($(result).find("strong").text().slice(0,-1));
			$(result).find("strong").remove();
			recentDiseases.push($(result).text());
		});

		listOfCountries.forEach(function(podatek) {
			$("#seznamDrzav").append('<option value="">' + podatek + '</option>');
		});
	});
	
	$("#seznamDrzav").change(function() {
	    var sporocilo = recentDiseases[$("#seznamDrzav").find(":selected").index()];
		if (sporocilo.length != 0)
			$("#trenutneBolezniSporocilo").html('<div id="trenutneBolezni" class="alert alert-warning" role="alert">'+ "Zadnje znane okužbe: " + sporocilo + '</div>');
		else 
			$("#trenutneBolezniSporocilo").html("");
	});

	if (!pocisti) $("#kartoteka,#diagnoza").hide();
}

$(document).ready(function(){
	homeInit();
	$("#kartoteka,#diagnoza").hide();
	seznamUporabnikov();
	$("#title").hide();
    $("#title").show( "blind", {direction: "horizontal"}, 2000 );

	$("a[href*=a]").click(function(e) {
	    e.preventDefault();
	    window.open("index.html","_self");
	    homeInit();
	});  
	$("a[href*=b]").click(function(e) {
	    e.preventDefault();
	    window.open("generator.html","_self");
	}); 

	$("#pocisti1").click(function()
	{
		$("#sporociloVnosEHR,#obvestiloEHR").html("");
	});

	$("#pocisti2").click(function()
	{
	    $("#sporociloVnosVitalnihPodatkov").html("");
	});

	$("#pocisti").click(function()
	{
	    homeInit(true);
	});

	$("#datumrojstva").datepicker({
		changeMonth: true,
		changeYear: true,
		yearRange: "1950:2014",
		dateFormat: "yy-mm-dd",
		onSelect: function(dateText, inst) {
			$("input[name='datumRojstva']").val(dateText);
		}
    });

    $("#datummeritve").datepicker({
		changeMonth: true,
		changeYear: true,
		yearRange: "1950:2014",
		dateFormat: "yy-mm-dd",

		onSelect: function(dateText, inst) {
			$("input[name='datumMeritve']").val(dateText);
		},
    });

    $("#ogledKartoteke").click(function()
	{
		preberiEHR();
	});

	$("#seznamUporabnikov").change(function(index) {
		$("#pacientEHR").val($('#seznamUporabnikov').val());
	});
});

function getAge(dateString) 
{
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age + " let";
}
