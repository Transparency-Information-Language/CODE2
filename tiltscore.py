import sqlite3
import json
import requests


def getDomainByUrl(url):
    if url.__contains__("www."):
        url = url.replace("www.", "")
    urlSplit = url.split("/")[0].split(".")
    if len(url) >= 3:
        url.pop(0)
    url = ".".join(urlSplit)
    return url


def getScore(domains):
    dataSummary = {}
    newLabelsDB = sqlite3.connect('newLabels.db')

    for domain in domains:
        query = f"SELECT domain FROM dict WHERE domain = '{domain}';"
        rowEntry = newLabelsDB.cursor().execute(
            query).fetchall()  # row with the given domain
        dataSummary[domain] = []

        if rowEntry:
            query = f"SELECT name FROM columns;"
            columns = newLabelsDB.cursor().execute(query).fetchall()

            for i in range(columns.__len__()):
                c = columns[i]
                query = f"SELECT {c[0]} FROM dict WHERE domain = '{domain}';"
                rowEntry = newLabelsDB.cursor().execute(query).fetchall()
                entry = (rowEntry[0])[0]
                dataSummary[domain].append(json.loads(entry))

        if not dataSummary[domain]:
            tiltScore = getTilthubScore(domain)["tilthub"]["score"]
            dictionary = {
                "label": tiltScore
            }
            dataSummary[domain] = dictionary
            saveLabel(dictionary, domain)

    return json.dumps(dataSummary)


def saveLabel(dictionary, domain):
    newLabelsDB = sqlite3.connect('newLabels.db')
    for i in range(dictionary.__len__()):
        dict = dictionary[i]
        dictString = json.dumps(dict)
        start = dictString.find('"') + 1
        end = dictString.find('"', start)
        key = dictString[start:end]

        if key[-3:] == '.db':
            key = dictString[start:end - 3]

        query = f"INSERT INTO dict (domain) SELECT '{domain}' WHERE NOT EXISTS (SELECT domain FROM dict WHERE domain = '{domain}'):"
        newLabelsDB.cursor().execute(query)
        newLabelsDB.commit()

        query = f"INSERT INTO columns (name) SELECT '{key}' WHERE NOT EXISTS (SELECT name FROM columns WHERE  name = '{key}';"
        newLabelsDB.cursor().execute(query)
        newLabelsDB.commit()

        try:
            query = f"ALTER TABLE dict ADD \"{key}\" varchar(999);"
            newLabelsDB.cursor().execute(query)
            newLabelsDB.commit()

            query = f"UPDATE dict SET {key} = '{dictString}' WHERE domain = '{domain}';"
            newLabelsDB.cursor().execute(query)
            newLabelsDB.commit()

        except:
            query = f"UPDATE dict SET {key} = '{dictString}' WHERE domain = '{domain}';"
            newLabelsDB.cursor().execute(query)
            newLabelsDB.commit()
            continue


def getTilthubScore(domain):
    tiltHubAPI = "http://ec2-3-64-237-95.eu-central-1.compute.amazonaws.com:8080/tilt/tilt"
    response = requests.get(tiltHubAPI, auth=("admin", "secret"))
    tiltHubEntry = json.loads(response.content)

    tiltDoc = {
        "score": "0",
        "Data Disclosed": "",
        "Third Country Transfers": "",
        "Right to Withdraw Consent": "",
        "Right to Complain": "",
        "Data Protection Officer": "",
        "Right to Data Portability": "",
        "Right to Information": "",
        "Right to Rectification or Deletion": "",
        "Automated Decision Making": "",
    }

    for i in range(len(tiltHubEntry)):
        url = tiltHubEntry[i]["meta"]["url"].split("//")[1]
        score = 0  # low score is better

        if getDomainByUrl(url) == domain:
            tiltInfo = tiltHubEntry[i]

            tiltDoc["Right to Complain"] = str(
                tiltInfo["rightToComplain"]["available"])  # T/F
            tiltDoc["Right to Withdraw Consent"] = str(
                tiltInfo["rightToWithdrawConsent"]["available"])  # T/F
            tiltDoc["Right to Data Portability"] = str(
                tiltInfo["rightToDataPortability"]["available"])  # T/F
            tiltDoc["Right to Information"] = str(
                tiltInfo["rightToInformation"]["available"])  # T/F
            tiltDoc["Right to Rectification or Deletion"] = str(
                tiltInfo["rightToRectificationOrDeletion"]["available"])  # T/F
            tiltDoc["Automated Decision Making"] = str(
                tiltInfo["automatedDecisionMaking"]["inUse"])  # T/F

            for key, value in tiltDoc["tilthub"].items():
                if str(value) == "False":
                    score += 0.3

            # name/email/phone/country/address exist #TODO: look for at least a name or email
            tiltDoc["Data Protection Officer"] = str(
                tiltInfo["dataProtectionOfficer"]["name"])

            if tiltInfo["dataProtectionOfficer"]["name"] is None:
                score += 0.3

            tiltDoc["Third Country Transfers"] = str(
                len(tiltInfo["thirdCountryTransfers"]))  # number of countries

            if len(tiltInfo["thirdCountryTransfers"]) > 1:
                score += 0.3

    # TODO: think about a good label calculation algorithm
    tiltDoc["score"] = score
    return tiltDoc
