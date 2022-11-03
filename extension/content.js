let tiltdb = chrome.runtime.getURL("tiltdb.json");
let urlElements = document.getElementsByClassName("yuRUbf");

const labels = [
  chrome.runtime.getURL("images/not_found_16.png"),
  chrome.runtime.getURL("images/green_icon_16.png"),
  chrome.runtime.getURL("images/yellow_icon_16.png"),
  chrome.runtime.getURL("images/red_icon_16.png"),
];

let tiltDoc = {
  "Data Disclosed": "",
  "Third Country Transfers": "",
  "Right to Withdraw Consent": "",
  "Right to Complain": "",
  "Data Protection Officer": "",
  "Right to Data Portability": "",
  "Right to Information": "",
  "Right to Rectification or Deletion": "",
  "Automated Decision Making": "",
};

let countries = [];

async function getDomain(url) {
  url = url.split("/")[0];
  let urlSplit = url.split(".");

  if (urlSplit.length >= 3) {
    urlSplit.shift();
  }

  url = urlSplit.join(".").replace('"', "");

  return url;
}

async function getScore(tiltHubEntry) {
  let score = 0;

  tiltDoc["Right to Complain"] = tiltHubEntry["rightToComplain"]["available"];
  tiltDoc["Right to Withdraw Consent"] =
    tiltHubEntry["rightToWithdrawConsent"]["available"];
  tiltDoc["Right to Data Portability"] =
    tiltHubEntry["rightToDataPortability"]["available"];
  tiltDoc["Right to Information"] =
    tiltHubEntry["rightToInformation"]["available"];
  tiltDoc["Right to Rectification or Deletion"] =
    tiltHubEntry["rightToRectificationOrDeletion"]["available"];
  // in order to preserve logic, we convert true to mean something good!
  tiltDoc["Automated Decision Making"] = !(
    tiltHubEntry["automatedDecisionMaking"]["available"]);

  Object.values(tiltDoc).forEach((value) => {
    if (!value) {
      score += 0.3;
    }
  });

  tiltDoc["Data Protection Officer"] =
    tiltHubEntry["dataProtectionOfficer"]["email"];

  if ((tiltHubEntry["dataProtectionOfficer"]["email"] = null)) {
    score += 0.3;
  }

  tiltDoc["Third Country Transfers"] =
    tiltHubEntry["thirdCountryTransfers"].length;

  if (tiltHubEntry["thirdCountryTransfers"].length > 1) {
    score += 0.3;
  }else if((tiltHubEntry["thirdCountryTransfers"].length == 1 )&& (tiltHubEntry["thirdCountryTransfers"][0].country !== null)){
    console.log("During prep, thirdcountrys are of length 1 and value is ", tiltHubEntry["thirdCountryTransfers"][0]);
    if(tiltHubEntry["thirdCountryTransfers"][0].country.length > 0){
      console.log(" - that is why we updated the score");
      score += 0.3;
    }
  }

  tiltDoc["Data Disclosed"] = tiltHubEntry["dataDisclosed"];
  if (tiltHubEntry["dataDisclosed"].length > 1) {
    score += 0.3;
  }else if((tiltHubEntry["dataDisclosed"].length == 1 )&& (tiltHubEntry["dataDisclosed"][0].category !== null)){
    console.log("During prep, data disclosed are of length 1 and value is ", tiltHubEntry["dataDisclosed"][0]);
    if(tiltHubEntry["dataDisclosed"][0].category.length > 0){
      console.log(" - that is why we updated the score");
      score += 0.3;
    }
  }

  return score;
}

async function getAllTilts(){
  let tiltEntries = {};

  await fetch(tiltdb)
    .then((response) => response.json())
    .then((tiltHub) => {
      tiltHub.forEach(async (tiltHubEntry) => {
        let tiltDomain = await getDomain(
          tiltHubEntry["meta"]["url"].split("//")[1]
        );
        tiltEntries[tiltDomain] = tiltHubEntry;
        var thirdCountrytransfers = tiltHubEntry.thirdCountryTransfers;
        thirdCountrytransfers.forEach(element => {
          var country = element.country;
          if(typeof country === 'string' && country.match(/^[A-Z][A-Z]$/)){
            countries.push(country);
          }
        });
      });
    });
    console.log("TiltEntries are: ", tiltEntries);
    //console.log("Countries are ", countries );
    return tiltEntries;
}

async function getAllTiltScores(tiltEntries) {
  let tiltAllScores = {};
  for (const key of Object.keys(tiltEntries)){
    let score = await getScore(tiltEntries[key]);
    tiltAllScores[key] = score;
  }
  //console.log("TiltScores are: ", tiltAllScores);
  return tiltAllScores;
}

async function printLabels(score, heading, tiltEntry) {
  let result;

  if (score == 0) {
    result = 0;
  } else {
    result = score < 1 ? 1 : score < 2 ? 2 : 3;
  }
  var image = new Image();
  image.classList.add("code-selector-img");
  image.src = labels[result];
  image.alt = "Label = " + result;
  if(score != 0){
    image.onmouseover = fill_popup(score, tiltEntry);
  }
  
  var wrapper = document.createElement("div");
  wrapper.classList.add("tiltension");
  wrapper.appendChild(image);
  
  if(score == 0){
    var popup = document.createElement("div");
    popup.classList.add("popup");
    popup.innerHTML = "<h2>Leider liegen zu diesem Anbieter keine TILT Informationen vor.</h2>";
    wrapper.appendChild(popup);
  }else{
    wrapper.appendChild(fill_popup(score, tiltEntry));
  }

  console.log("this is the wrapper", wrapper);
  appendToG(heading.parentNode, wrapper);
  document.getElementById("click_here").addEventListener("click", explainScore);
}

function appendToG(node, wrapper){
  if(node.classList.contains("g")){
    node.insertBefore(wrapper, node.firstChild);
  }else{
    appendToG(node.parentNode, wrapper);
  }
}

function fill_popup(score, tiltEntry){
  console.log("in popup tilt enty ", tiltEntry, " with score ", score);

  var popup = document.createElement("div");
  popup.classList.add("popup");
  popup.innerHTML = "<h2>TILT Informationen zu <i>"+tiltEntry.meta.name+"</i></h2>";

  /**
   * Zusammenfassung der wichtigsten TILT Merkmale
   **/
  var tilt_div= document.createElement("div");
  tilt_div.classList.add("tilt_summary");
  tilt_div.innerHTML += "<h4>Zusammenfassung der Transparenzinformationen:</h4>";
  /*Verantwortlicher*/
  var list = document.createElement("ul");
  var list_element = document.createElement("li");
  list_element.classList.add("tilt_controller");
  let list_element_text = "<b>Verantwortlicher (e-Mail):</b> ";
  let email = tiltEntry.dataProtectionOfficer.email;
  if(email!=null){
    console.log("found mail: ", email);
    list_element_text += email;
  }else{
    list_element_text += "<span style=\"color:red;\">Leider liegt keine e-Mail-Adresse vor.</span>";
  }
  console.log("list_element_text", list_element_text);
  list_element.innerHTML = list_element_text;
  list.appendChild(list_element);
  /*Third Country Transfers: 
  ** due to Chrome-Windows/Unix Bug, UNICODE emoji-flags do not work. 
  ** Instead, we use the GPL licensed data set from: https://github.com/cristiroma/countries/
  */
  list_element = document.createElement("li");
  list_element.classList.add("tilt_country_transfers");
  list_element_text = "<b>Datentransfer in Drittstaaten:</b> ";
  let transfers = tiltEntry.thirdCountryTransfers;
  console.log("For ", tiltEntry.meta.name, " the transfers are ", transfers);

    list_element.innerHTML = list_element_text;
    transfers.forEach(element => {
      if(countries.includes(element.country)){
        console.log("Found country: ", element.country);
        /*
        for unicode emojis
        popup.innerHTML = countries[element.country];
        */
        //popup.innerHTML += "<img src=\"images/cristiroma_countries_data_flags_SVG/"+element.country+".svg\" width=\"5px\" alt=\""+element.country+"\"></img>";
        var image = new Image();
        image.classList.add("code-emoji-flag");
        image.src = chrome.runtime.getURL("images/cristiroma_countries_data_flags_SVG/"+element.country+".svg");
        image.alt = "Country = " + element.country;
        list_element.appendChild(image);
      }else{
        list_element.innerHTML += "<span style=\"color:red;\"> " + element.country +" </span>"
      }
    });
    try{
    if(transfers.length==1 && (typeof transfers[0].country == null || transfers[0].country.length === 0)){
      console.log("only one element in transfers ", transfers[0]);
      list_element_text += "<span>Es liegen keine Informationen zu Drittstaatentransfers vor.</span>";
      list_element.innerHTML = list_element_text;
    }} catch (e){
      if (e instanceof TypeError){
        // it is fine
      } else{
        throw e;
      }
    }
    list.appendChild(list_element);
  
  /*Data Disclosed*/
  list_element = document.createElement("li");
  list_element.classList.add("tilt_data_disclosed");
  list_element_text = "<b>Datenkategorien, die verarbeitet werden:</b> <ul id=\"data_disclosed\">";
  let data_disclosed = tiltEntry.dataDisclosed;
  console.log("Data Disclosed ", data_disclosed);
  data_disclosed.forEach(element => {
    if(element.category !== null){
      if(element.category.length > 0){
        list_element_text += "<li style=\"color:red;\"> " + element.category +"</li>";
      }
    }
  });
  if(list_element_text === "<b>Datenkategorien, die verarbeitet werden:</b> <ul>"){
    list_element_text += "Es liegen keine Informationen über die verarbeiteten Datenkategorien vor";
  }
  list_element_text += "</ul>";
  list_element.innerHTML = list_element_text;
  list.append(list_element);
  
  /*Automated Decision Making */
  list_element = document.createElement("li");
  list_element.classList.add("tilt.decision_making");
  list_element_text = "<b>Automatisierte Entscheidungsfindung:</b> ";
  if(tiltEntry.automatedDecisionMaking.inUse){
    console.log("automated decisionmaking: ", tiltEntry.automatedDecisionMaking.inUse);
    list_element_text += "<span style=\"color:red;\">wird genutzt</span>";
  }else{
    list_element_text += "<span>wird nicht genutzt</span>";
  }
  list_element.innerHTML = list_element_text;
  list.append(list_element);

  tilt_div.appendChild(list);
  popup.appendChild(tilt_div);  
  popup.innerHTML += "<p> Die Labels werden auf Grund von einem Transparenzscore berechnet. Für diese Webseite beträgt der Score : "+score+".\n Wenn du mehr zu der Berechnung des Scores erfahren möchtest klicke bitte <a id=\"click_here\">hier</a></p><p id=\"score_explanation\"></p>"; /*TODO Link mit Inhalt füllen bzw. Popup verlängern*/
  console.log("popup = ", popup);
  return popup;
}

function explainScore(){
  console.log("explaining score....");
  var element = document.getElementById("score_explanation");
  console.log("element ", element);
  if(element.innerHTML ==""){
    element.innerHTML = "Die Berechnung des Transparenzscores folgt zur Zeit sehr einfachen Regeln und auf Basis des TILT-Eintrags. Daraufhin wird jeder Webseite eines der drei Label zugewiesen: <br /> 1. Erklärung der Labels: <ul><li>eine Website erhält ein grünes Label, wenn der Score unter 1 ist</li><li>eine Website erhält ein gelbes Label, wenn der Score unter 2 ist</li><li>eine Website erhält ein rotes Label, wenn der Score höher ist</li></ul> 2. Erklärung des Scores: Es gibt verschiedene Faktoren, die den Score beeinflussen. Der Score erhöht sich, wenn: <ul><li>ein Recht nicht verfügbar ist (z.B. wenn das Recht zur Datenauskunft nicht in der Datenschutzerklärung erwähnt wird)</li><li>automatisierte Enscheidungsfindung genutzt wird</li><li>keine e-Mail-Adresse des Verantwortlichen angegeben ist</li><li>Drittstaatentransfers stattfinden</li></ul>";
  }else{
    element.innerHTML = "";
  }

  console.log("element (new)", document.getElementById("score_explanation"));
}

async function main() {
  let tiltEntries = await getAllTilts();
  let tiltAllScores = await getAllTiltScores(tiltEntries);
  let results = {};
  let index = 0;

  var meta = document.createElement('meta');  
  meta.charset = "UTF-16";
  document.getElementsByTagName('head')[0].appendChild(meta);
  
  for (let e of urlElements) {
    let url = JSON.stringify(e.children[0].href).replace("https://", "");
    let domain = await getDomain(url);
    results[domain] = 0;

    Object.keys(tiltAllScores).forEach(async (key) => {
      if (key == domain) {
        results[domain] = tiltAllScores[key];
      }
    });
    console.log("Domain: " + domain + ", score: " + results[domain]);
    const headings = document.getElementsByClassName("LC20lb MBeuO DKV0Md");
    await printLabels(results[domain], headings[index], tiltEntries[domain]);
    index++;
  }
}

main();