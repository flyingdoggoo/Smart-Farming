const fs = require('fs');
const https = require('https');
const path = require('path');

const crops = {
    1: 'Rice_field', 2: 'Maize', 3: 'Jute_field', 4: 'Cotton_plant', 5: 'Coconut', 6: 'Papaya', 7: 'Orange_fruit',
    8: 'Apple', 9: 'Muskmelon', 10: 'Watermelon', 11: 'Grapes', 12: 'Mango', 13: 'Banana',
    14: 'Pomegranate', 15: 'Lentil', 16: 'Black_gram', 17: 'Mung_bean', 18: 'Vigna_aconitifolia',
    19: 'Pigeon_pea', 20: 'Kidney_bean', 21: 'Chickpea', 22: 'Coffee_beans'
};

const dir = path.join(process.cwd(), 'client/public/assets/crops');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function run() {
    for (const [id, term] of Object.entries(crops)) {
        try {
            const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${term}&prop=pageimages&format=json&pithumbsize=400`;
            const res = await fetch(url, { headers: { 'User-Agent': 'CoolBot/1.0' }});
            const data = await res.json();
            const pages = data.query.pages;
            const page = Object.values(pages)[0];
            
            if (page.thumbnail) {
                const imgRes = await fetch(page.thumbnail.source);
                const arrayBuffer = await imgRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                fs.writeFileSync(path.join(dir, `${id}.jpg`), buffer);
                console.log(`Downloaded ${term} -> ${id}.jpg`);
            } else {
                console.log(`No thumbnail for ${term}`);
                // Retry with base name
                const retryTerm = term.split('_')[0];
                const retryUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${retryTerm}&prop=pageimages&format=json&pithumbsize=400`;
                const retryRes = await fetch(retryUrl, { headers: { 'User-Agent': 'CoolBot/1.0' }});
                const retryData = await retryRes.json();
                const retryPage = Object.values(retryData.query.pages)[0];
                if (retryPage.thumbnail) {
                    const imgRes = await fetch(retryPage.thumbnail.source);
                    const arrayBuffer = await imgRes.arrayBuffer();
                    fs.writeFileSync(path.join(dir, `${id}.jpg`), Buffer.from(arrayBuffer));
                    console.log(`Downloaded ${retryTerm} -> ${id}.jpg`);
                }
            }
        } catch (e) {
            console.error(`Failed ${term}: `, e.message);
        }
    }
}
run();
