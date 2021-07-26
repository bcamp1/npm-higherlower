const axios = require('axios')
const cheerio = require('cheerio')
const fs = require('fs');
const readline = require('readline');

const inFile = 'popular-repos.txt'
const outFile = 'popular-repos.json'

async function getPopularRepos(limit, printError, loadFromFile) {
    var data = {}
    var dataSize = 0

    if (loadFromFile) {
        data = JSON.parse(fs.readFileSync(outFile, 'utf8'))
        dataSize = Object.keys(data).length
    }

    const fileStream = fs.createReadStream(inFile);

    const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.
    var i = 0
    var length = 0
    for await (const line of rl) {
        i++
        // Each line in input.txt will be successively available here as `line`.
        const name = line.split('[')[1].split(']')[0]
        console.log("Processing", name)

        if (!(name in data)) {
            var pkgData
            try {
                pkgData = await getData(name)
                data[name] = pkgData
                console.log('Success')
                length++
                dataSize++
            } catch (error) {
                if (printError) {
                    console.log(error)
                } else {
                    console.log('Error')
                }
            }

            
        } else {
            console.log('Skipping')
            length++
        }

        console.log(length, "/", i, "/", dataSize)

        if (length >= limit) {
            return data
        }

        fs.writeFile(outFile, JSON.stringify(data, null, 2), function (err) {
            if (err) return console.log(err);
        });
        
    }
    return data
}

getPopularRepos(1000, false, true).then(v => {
    
})

async function getData(name) {
    let registry = await regInfo(name)
    let downloads = await weeklyDownloads(name)
    let repo = registry['repository']

    var authorInfo = registry['author']
    var author

    if (authorInfo !== undefined) {
        author = authorInfo['name']
    } else {
        const keys = Object.keys(registry['versions'])
        author = registry['versions'][keys[0]]['author']['name']
    }



    return {
        keywords: registry['keywords'],
        author: author,
        description: registry['description'],
        repo: repo['url'].split('+')[1],
        downloads: parseInt(downloads.split(',').join('')),
    }
}

async function regInfo(name) {
    const url = 'https://registry.npmjs.org/' + name
    res = await axios(url)
    return res.data
}

async function weeklyDownloads(name) {
    res = await axios('https://npmjs.org/package/' + name)
    const html = res.data;
    const $ = cheerio.load(html);
    const downloads = $("._9ba9a726").text();
    return downloads
}