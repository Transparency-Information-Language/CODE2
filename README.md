# TILTension

### A TILT extension for Google Chrome.

Extension for the Chrome browser which allow users to see wether there is a [TILT](https://github.com/Transparency-Information-Language/meta) representation of the transparency information, before even visiting the webpage - directly on your Google Search page.

```bibtex
@inproceedings{gruenewald2021datensouveränität,
  author    = {Elias Grünewald and Frank Pallas},
  title     = {Datensouveränität für Verbraucher:innen: Technische Ansätze durch KI-basierte Transparenz und Auskunft im Kontext der DSGVO},
  series = {Alexander Boden, Timo Jakobi, Gunnar Stevens, Christian Bala (Hgg.): Verbraucherdatenschutz - Technik und Regulation zur Unterstützung des Individuums},
  isbn      = {978-3-96043-095-7},
  doi       = {10.18418/978-3-96043-095-7\_02},
  url       = {https://nbn-resolving.org/urn:nbn:de:hbz:1044-opus-60219},
  pages     = {1 -- 17},
  year      = {2021},
}
```

See the related publication here (in German): https://pub.h-brs.de/frontdoor/index/index/docId/6021

## Add the extension

1. Open Chrome browser, navigate to `chrome://extensions/` and enable `Developer mode`
2. Go to `Load unpacked` and select the `extension` directory
3. You a ready to go: Google something and check out the labels 🟢🟡🔴

## Description
Basically, there is one relevant file that takes over all the calculation and printing:
### content.js
In `main()` the labels from all websites which are in the `tiltHub database` are calculated to speed up the process later. Then, for each Google Search results a tilt score is calculated and is being printed as a label next to the result's heading.

### tilt score and labels
There are nine major entries in a tilt document where each has an impact on the tilt score:
- Right to `complain`, `withdraw consent`, `data portability`, `information`, `rectification or deletion` are all binary options. So, if those rights are not forseen by the company (non existant or are `false`), the score encreases by a value of `0.6`.
- If `automated decision making` is in place, the score encreases by `0.6`.
- `Data Protection Officer`: If no contact email is provided here the score encreases by `0.6`. 
- `Third country transfers`: If there are any third country transfers the score encreases by `0.6`.
- `Data Disclosed`: Despite having a legal basis for disclosing data to third parties the fact that data may be disclosed encreases the score by `0.6`.

A search result can get a score between 1,0 and 3,0. In general, the higher the score the "worse". Higher score means there are several critical entries in the tilt document. A score = 0 means that there is no tiltHub entry for this website.

### tiltdb.json and API-Calls
Since, Google Chrome only allows API-Calls via https and no such endpoint was provided yet, another temporary solution had to be found in order to access the tilt database.

The extension pack includes the `tiltdb.json` file. This is the whole tilt database from July 2022. `getAllTiltScore()` function goes through this database and calculates the score. The result is being stored in a .json format (domain:score).

*Comment: A self-created certificate was provided to access the database. However, in order to access the website the user has to accept the certificate manually for security reasons. Setting a header to accept the certificate by default is not allowed by Google Chrome, which makes sense. There is no other workaround as to provide a https endpoint in order to access the db.*

### tiltscore.py
*Ignore, if not needed for implementation*

This is a little inspiration (with a lot of previous work by the CODE group) for an implementation in a backend. In case, future work will require a backend this code snippet can be used to calculated the score and store the values in a database to shorten the calculation for repeated search queries. Besides that, this file has no impact on the extension.

## Outlook
Future work on this extension might include removing the database from the extension directory and replacing it with an API-Call. However, not every single search query should be sent to the backend for obvious privacy reasons. Instead, the API-Call should download the whole database to the local storage of the user and all search results have to be mapped to the database locally. Downloading the database should only happen if there are any changes or on a regular basis for example once per month.
