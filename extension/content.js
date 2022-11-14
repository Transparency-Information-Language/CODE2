let tiltdb = browser.runtime.getURL("tiltdb.json");
let urlElements = document.getElementsByClassName("yuRUbf");

const labels = [
  browser.runtime.getURL("images/not_found_16.png"),
  browser.runtime.getURL("images/green_icon_16.png"),
  browser.runtime.getURL("images/yellow_icon_16.png"),
  browser.runtime.getURL("images/red_icon_16.png"),
];

let tiltDoc = {
  "Right to Withdraw Consent": "",
  "Right to Complain": "",
  "Right to Data Portability": "",
  "Right to Information": "",
  "Right to Rectification or Deletion": ""
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
  //console.log("computing score for ", tiltHubEntry.meta.name, " initial score is ", score);

  /* fill right tos */
  tiltDoc["Right to Complain"] = tiltHubEntry["rightToComplain"]["available"];
  tiltDoc["Right to Withdraw Consent"] =
    tiltHubEntry["rightToWithdrawConsent"]["available"];
  tiltDoc["Right to Data Portability"] =
    tiltHubEntry["rightToDataPortability"]["available"];
  tiltDoc["Right to Information"] =
    tiltHubEntry["rightToInformation"]["available"];
  tiltDoc["Right to Rectification or Deletion"] =
    tiltHubEntry["rightToRectificationOrDeletion"]["available"];

  /* merge into one value */
  let rights = false;
  let counter = 0;
  Object.values(tiltDoc).forEach((value) => {
    if (!value) {
      //console.log("Missing right to: ", counter);
      rights = true;
    }
    counter++;
  });
    
  /* set score */
  if(rights){
    //console.log(" increased score due to missing right to");
    score += 0.6;
  }
  if(tiltHubEntry["automatedDecisionMaking"]["available"]){
    //console.log(" increased score due to automated descisionmaking ", tiltHubEntry["automatedDecisionMaking"]["available"]);
    score +=0.6;
  }
  if ((tiltHubEntry["dataProtectionOfficer"]["email"] == null)) {
    //console.log(" increased score due to missing mail");
    score += 0.6;
  }
  if (tiltHubEntry["thirdCountryTransfers"].length > 1) {
    //console.log(" increased score due to length of countries >1");
    score += 0.6;
  }else if((tiltHubEntry["thirdCountryTransfers"].length == 1 )&& (tiltHubEntry["thirdCountryTransfers"][0].country !== null)){
    if(tiltHubEntry["thirdCountryTransfers"][0].country.length > 0){
      //console.log(" increased score due to countries include one real country");
      score += 0.6;
    }
  }
  if (tiltHubEntry["dataDisclosed"].length > 1) {
    //console.log(" increased score due to length of data disclosed >1");
    score += 0.6;
  }else if((tiltHubEntry["dataDisclosed"].length == 1 )&& (tiltHubEntry["dataDisclosed"][0].category !== null)){
    if(tiltHubEntry["dataDisclosed"][0].category.length > 0){
      //console.log(" increased score due to  data disclosed one real item");
      score += 0.6;
    }
  }

  //console.log(" final score is ", score);
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
        /* needed this for unicode emojis and did not delete it, however it is not strictly necessary here, regex could be moved to correct place in fill_popup */
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
    return tiltEntries;
}

async function getAllTiltScores(tiltEntries) {
  let tiltAllScores = {};
  for (const key of Object.keys(tiltEntries)){
    let score = await getScore(tiltEntries[key]);
    tiltAllScores[key] = score;
  }
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
  //console.log("in popup tilt enty ", tiltEntry, " with score ", score, " restarting computation of score....");

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

  /*Data Disclosed*/
  list_element = document.createElement("li");
  list_element.classList.add("tilt_data_disclosed");
  list_element_text = "<b>Datenkategorien, die verarbeitet werden:</b> <ul class=\"tilt_entry_list\">";
  let data_disclosed = tiltEntry.dataDisclosed;
  //console.log("Data Disclosed ", data_disclosed);
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
        /*
        for unicode emojis
        popup.innerHTML = countries[element.country];
        */
        //popup.innerHTML += "<img src=\"images/cristiroma_countries_data_flags_SVG/"+element.country+".svg\" width=\"5px\" alt=\""+element.country+"\"></img>";
        var image = new Image();
        image.classList.add("code-emoji-flag");
        image.src = browser.runtime.getURL("images/cristiroma_countries_data_flags_SVG/"+element.country+".svg");
        image.alt = "Country = " + element.country;
        list_element.appendChild(image);
      }else{
        list_element.innerHTML += "<span style=\"color:red;\"> " + element.country +", </span><br />"
      }
    });
    try{
    if(transfers.length==1 && (typeof transfers[0].country == null || transfers[0].country.length === 0)){
      //console.log("only one element in transfers ", transfers[0]);
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
  
  
  /* Right Tos */
  list_element = document.createElement("li");
  list_element.classList.add("tilt_right_tos");
  list_element_text = "<b>Die folgenden Rechte sind verfügbar:</b> <ul class=\"tilt_entry_list\">";
  list_element_text += "<li> Das Recht auf transparente Information: ";
  if(tiltEntry["rightToInformation"]["available"]){
    list_element_text +="✔️";
  }else{
    list_element_text +="❌"
  }
  list_element_text += "</li>";
  list_element_text += "<li> Das Recht auf Datenauskunft und das Recht auf Datenportabilität: ";
  if(tiltEntry["rightToDataPortability"]["available"]){
    list_element_text +="✔️";
  }else{
    list_element_text +="❌"
  }
  list_element_text += "</li>";
  list_element_text += "<li> Das Recht auf Berichtigung und das Recht auf Löschung: ";
  if(tiltEntry["rightToRectificationOrDeletion"]["available"]){
    list_element_text +="✔️";
  }else{
    list_element_text +="❌"
  }
  list_element_text += "</li>";
  list_element_text += "<li> Das Recht auf Widerruf der Einwilligung: ";
  if(tiltEntry["rightToWithdrawConsent"]["available"]){
    list_element_text +="✔️";
  }else{
    list_element_text +="❌"
  }
  list_element_text += "</li>";
  list_element_text += "<li> Das Recht auf Beschwerde bei einer Aufsichtsbehörde: ";
  if(tiltEntry["rightToComplain"]["available"]){
    list_element_text +="✔️";
  }else{
    list_element_text +="❌"
  }
  list_element_text += "</li></ul>";
  list_element.innerHTML = list_element_text;
  list.appendChild(list_element);
   
  /*Automated Decision Making */
  list_element = document.createElement("li");
  list_element.classList.add("tilt.decision_making");
  list_element_text = "<b>Automatisierte Entscheidungsfindung:</b> ";
  if(tiltEntry.automatedDecisionMaking.inUse){
    //console.log("automated decisionmaking: ", tiltEntry.automatedDecisionMaking.inUse);
    list_element_text += "<span style=\"color:red;\">wird genutzt</span>";
  }else{
    list_element_text += "<span>wird nicht genutzt</span>";
  }
  list_element.innerHTML = list_element_text;
  list.append(list_element);

  tilt_div.appendChild(list);
  popup.appendChild(tilt_div);  
  popup.innerHTML += "<p> Die Labels werden auf Grund von einem Transparenzscore berechnet. Für diese Webseite beträgt der Score : "+score/0.6+".\n Wenn du mehr zu der Berechnung des Scores erfahren möchtest klicke bitte <a id=\"click_here\">hier</a></p><p id=\"score_explanation\"></p>"; /*TODO Link mit Inhalt füllen bzw. Popup verlängern*/
  //console.log("popup = ", popup);
  return popup;
}

function explainScore(){
  var element = document.getElementById("score_explanation");
  if(element.innerHTML ==""){
    element.innerHTML = "Die Berechnung des Transparenzscores folgt zur Zeit sehr einfachen Regeln und auf Basis des TILT-Eintrags. <br />";
    element.innerHTML += "<p>Zunächst werden 5 Kategorien von Transparenzinformationen bewertet und für jede negative Bewertung erhöht sich der Score um 1. Die Kategorien der Transparenzinformationen und ihre negativen Eigenschaften werden im Folgenden aufgeführt:";
    element.innerHTML += "<ul><li>keine <b>e-Mail-Adresse des Verantwortlichen</b> angegeben ist</li><li><b>personenbezogene Daten</b> verarbeitet werden</li><li><b>Drittstaatentransfers</b> stattfinden</li><li>mindestens ein <b>Betroffenenrecht</b>  ist nicht verfügbar (z.B. wenn das Recht zur Datenauskunft nicht in der Datenschutzerklärung erwähnt wird)</li><li><b>automatisierte Enscheidungsfindung</b> genutzt wird</li></ul></p>";
    element.innerHTML += "<p>Daraufhin wird jeder Webseite eines der drei Label zugewiesen: <ul><li>eine Website erhält ein <b>grünes Label</b>, wenn maximal 1 Transparenzinformationen negativ bewertet wird </li><li>eine Website erhält ein <b>gelbes Label</b>, wenn 2 oder 3 Transparenzrechte negativ bewertet werden</li><li>eine Website erhält ein <b>rotes Label</b>, wenn 4 oder 5 Transparenzrechte negativ bewertet werden</li></ul></p>"; 
  }else{
    element.innerHTML = "";
  }
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
    console.log("inspecting domain ", domain);
    if(domain === "wikipedia.de" || domain === "wikipedia.org"){
      domain = "wikimedia.org";
    }
    results[domain] = 0;


    Object.keys(tiltAllScores).forEach(async (key) => {
      if (key == domain) {
        results[domain] = tiltAllScores[key];
      }
    });
    const headings = document.getElementsByClassName("LC20lb MBeuO DKV0Md");
    await printLabels(results[domain], headings[index], tiltEntries[domain]);
    index++;
  }
}

main();