let tiltdb = chrome.runtime.getURL("tiltdb.json");
let urlElements = document.getElementsByClassName("yuRUbf");

const labels = [
    [chrome.runtime.getURL("images/not_found.png"), "none"],
    [chrome.runtime.getURL("images/green_icon_128.png"), "green"],
    [chrome.runtime.getURL("images/yellow_icon_128.png"), "yellow"],
    [chrome.runtime.getURL("images/red_icon_128.png"), "red"],
];

let tiltDoc = {
    score: "0",
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

function getDomain(url) {
    url = url.split("/")[0];
    let url_split = url.split(".");
    if (url_split.length >= 3) {
        url_split.shift();
    }
    url = url_split.join(".").replace('"', "");
    return url;
}

function printLabels() {
    //add popup next to result
    //let popup = $("<div class='list'> <div class='entry'> <img class='code-selector' alt='Label Image' src='" + labels[label][0] + "> <div class='content'> <div class='inner'> <h2>" + tracker + " Trackers</h2> <h4> From:</h4>" + logos_normal + "</div> </div> </div> </div > ");
    //popup.appendTo(div);
    //$("head").append("<link type=\"text/css\" rel=\"stylesheet\" href=\"style.css\">");
}

function getScore(domain, tiltHubEntry) {
    score = 1;
    let tiltInfo = tiltHubEntry[1];

    tiltDoc["Right to Complain"] = tiltInfo["rightToComplain"]["available"];
    tiltDoc["Right to Withdraw Consent"] = tiltInfo["rightToWithdrawConsent"]["available"];
    tiltDoc["Right to Data Portability"] = tiltInfo["rightToDataPortability"]["available"];
    tiltDoc["Right to Information"] = tiltInfo["rightToInformation"]["available"];
    tiltDoc["Right to Rectification or Deletion"] = tiltInfo["rightToRectificationOrDeletion"]["available"];
    tiltDoc["Automated Decision Making"] = tiltInfo["automatedDecisionMaking"]["available"];

    Object.values(tiltDoc).forEach((value) => { if (!value) { score += 0.3; } });

    tiltDoc["Data Protection Officer"] = tiltInfo["dataProtectionOfficer"]["email"];
    if ((tiltInfo["dataProtectionOfficer"]["email"] = null)) { score += 0.3; }

    tiltDoc["Third Country Transfers"] = tiltInfo["thirdCountryTransfers"].length;
    if (tiltInfo["thirdCountryTransfers"].length > 1) { score += 0.3; }

    tiltDoc["Data Disclosed"] = tiltInfo["dataDisclosed"];
    if (tiltDoc["dataDisclosed"] != null) { score += 0.3; }

    tiltDoc["score"] = score;
    chrome.storage.local.set({ [domain]: score });
    console.log("New value was added to your local storage.")
    return score;
}

for (let element of urlElements) {
    let url = JSON.stringify(element.children[0].href);
    url = url.replace("https://", "");
    let domain = getDomain(url);
    let score = 0;
    let index = 0;

    fetch(tiltdb)
        .then((response) => response.json())
        .then((tiltHubEntry) => {
            while (index < tiltHubEntry.length) {
                let urlEntry = tiltHubEntry[index]["meta"]["url"].split("//")[1];
                urlEntry = getDomain(urlEntry);

                if (urlEntry === domain) { // Is there an entry in the TILT database?
                    //first, check the local storage, if the score was already calculated
                    chrome.storage.local.get(function (data) {
                        let domains = Object.keys(data);
                        let scores = Object.values(data);

                        domains.forEach((element, i) => {
                            if (element == domain) {
                                score = scores[i];
                                console.log("The score was found in your local storage: " + domain + ", " + score);
                            }
                        });
                    })
                    //printLabels();
                }
                index++;
            }
        });
}