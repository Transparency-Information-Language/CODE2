let tiltdb = chrome.runtime.getURL("tiltdb.json");
let urlElements = document.getElementsByClassName("yuRUbf");

const labels = [
  chrome.runtime.getURL("images/not_found_32.png"),
  chrome.runtime.getURL("images/green_icon_32.png"),
  chrome.runtime.getURL("images/yellow_icon_32.png"),
  chrome.runtime.getURL("images/red_icon_32.png"),
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
  tiltDoc["Automated Decision Making"] =
    tiltHubEntry["automatedDecisionMaking"]["available"];

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
  }

  tiltDoc["Data Disclosed"] = tiltHubEntry["dataDisclosed"];

  if (tiltHubEntry["dataDisclosed"] != null) {
    score += 0.3;
  }

  return score;
}

async function getAllTiltScores() {
  let tiltAllScores = {};
  //calculate tilt score for all tiltHub entries

  await fetch(tiltdb)
    .then((response) => response.json())
    .then((tiltHub) => {
      tiltHub.forEach(async (tiltHubEntry) => {
        let tiltDomain = await getDomain(
          tiltHubEntry["meta"]["url"].split("//")[1]
        );
        score = await getScore(tiltHubEntry);
        tiltAllScores[tiltDomain] = score;
      });
    });
  return tiltAllScores;
}

async function printLabels(score, heading) {
  let result;

  if (score == 0) {
    result = 0;
  } else {
    result = score < 1 ? 1 : score < 2 ? 2 : 3;
  }

  var image = new Image();
  image.src = labels[result];
  heading.prepend(image);
}

async function main() {
  let label = 0;
  let tiltAllScores = await getAllTiltScores();
  let results = {};
  let index = 0;

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
    label = await printLabels(results[domain], headings[index]);
    index++;
  }
}

main();
