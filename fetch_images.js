const fs = require('fs');
const path = require('path');

// Exact Wikipedia page titles
const crops = {
    1: 'Rice', 2: 'Maize', 3: 'Jute', 4: 'Cotton', 5: 'Coconut', 
    6: 'Papaya', 7: 'Orange_(fruit)', 8: 'Apple', 9: 'Muskmelon', 
    10: 'Watermelon', 11: 'Grape', 12: 'Mango', 13: 'Banana',
    14: 'Pomegranate', 15: 'Lentil', 16: 'Vigna_mungo', 17: 'Mung_bean', 
    18: 'Vigna_aconitifolia', 19: 'Pigeon_pea', 20: 'Kidney_bean', 
    21: 'Chickpea', 22: 'Coffee_bean'
};

const dir = path.join(process.cwd(), 'client/public/assets/crops');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function run() {
    for (const [id, term] of Object.entries(crops)) {
        try {
            const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${term}&prop=pageimages&format=json&pithumbsize=600`;
            const res = await fetch(url, { headers: { 'User-Agent': 'NCKHSF/1.0' }});
            const data = await res.json();
            const pages = data.query.pages;
            const page = Object.values(pages)[0];
            
            if (page.thumbnail) {
                const imgRes = await fetch(page.thumbnail.source, { headers: { 'User-Agent': 'NCKHSF/1.0 (test@k23bkdn.io.vn)' }});
                const arrayBuffer = await imgRes.arrayBuffer();
                fs.writeFileSync(path.join(dir, `${id}.jpg`), Buffer.from(arrayBuffer));
                console.log(`[OK] Downloaded ${term} -> ${id}.jpg`);
            } else {
                console.log(`[FAIL] No thumbnail for ${term}`);
            }
        } catch (e) {
            console.error(`[ERR] Failed ${term}: `, e.message);
        }
    }
}
run();
