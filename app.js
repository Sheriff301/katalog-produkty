const supabaseUrl = 'https://prpycsgjzihsjmsqymyt.supabase.co'; 
const supabaseKey = 'sb_publishable_TZ4EklfptNyLtDmtC4ULHg_7PkZCteK'; 

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let wszystkieProdukty = [];

// Pobiera listę produktów z bazy
async function pobierzCennik() {
    const { data, error } = await supabaseClient.from('produkty').select('*');
    if (error) {
        document.getElementById('katalog-pojemnik').innerHTML = '<p style="color: red;">Błąd wczytywania katalogu.</p>';
        return;
    }
    wszystkieProdukty = data;
    wyswietlKatalog(wszystkieProdukty, 'katalog-pojemnik');
    wygenerujKategorieDropdown();
}

// Renderuje karty produktów 
function wyswietlKatalog(produkty, docelowyPojemnikId) {
    const pojemnik = document.getElementById(docelowyPojemnikId);
    pojemnik.innerHTML = ''; 
    
    produkty.forEach(przedmiot => {
        const karta = document.createElement('div');
        karta.className = 'produkt-karta';
        // Kliknięcie w kartę otwiera szczegóły
        karta.onclick = () => pokazSzczegoly(przedmiot.id);
        
        const maPoprawnyObrazek = przedmiot.zdjecie_url && przedmiot.zdjecie_url.length > 10;
        const imgTag = maPoprawnyObrazek 
            ? `<img src="${przedmiot.zdjecie_url}" onerror="this.style.display='none'">`
            : `<div style="height:200px; background:#121214; display:flex; align-items:center; justify-content:center;">Brak zdjęcia</div>`;

        karta.innerHTML = `
            <div>
                ${imgTag}
                <span class="kategoria">${przedmiot.kategoria || 'Inne'}</span>
                <h3>${przedmiot.nazwa}</h3>
                <p class="opis">${przedmiot.opis || 'Brak opisu...'}</p>
            </div>
            <div style="margin-top: 15px;">
                <p class="cena">${przedmiot.cena} zł</p>
                <button class="btn-akcja" style="width: 100%; margin-top: 10px;">Pokaż szczegóły</button>
            </div>
        `;
        pojemnik.appendChild(karta);
    });
}

// Otwiera widok pojedynczego produktu
function pokazSzczegoly(idProduktu) {
    const produkt = wszystkieProdukty.find(p => String(p.id) === String(idProduktu));
    if (!produkt) return;

    const pojemnikSzczegolow = document.getElementById('szczegoly-pojemnik');
    const maPoprawnyObrazek = produkt.zdjecie_url && produkt.zdjecie_url.length > 10;
    const imgTag = maPoprawnyObrazek 
        ? `<img src="${produkt.zdjecie_url}" alt="${produkt.nazwa}">`
        : `<span>Brak dostępnego zdjęcia</span>`;

    pojemnikSzczegolow.innerHTML = `
        <div class="szczegoly-widok">
            <div class="szczegoly-obraz">
                ${imgTag}
            </div>
            <div class="szczegoly-info">
                <span class="kategoria" style="align-self: flex-start;">${produkt.kategoria || 'Inne'}</span>
                <h2>${produkt.nazwa}</h2>
                <p class="cena">${produkt.cena} zł</p>
                <h4 style="color: #fff; border-bottom: 1px solid #29292e; padding-bottom: 10px;">Opis produktu:</h4>
                <p class="opis-pelny">${produkt.opis || 'Ten produkt nie posiada jeszcze szczegółowego opisu.'}</p>
            </div>
        </div>
    `;

    zmienSekcje('szczegoly');
}

// Obsługuje przełączanie widoku między zakładkami
function zmienSekcje(nazwaSekcji) {
    document.querySelectorAll('.sekcja').forEach(s => s.classList.remove('aktywna'));
    document.querySelectorAll('nav > button, .dropdown-btn').forEach(b => b.classList.remove('aktywny'));
    
    const docelowaSekcja = document.getElementById('sekcja-' + nazwaSekcji);
    
    // Zapobiegamy podświetlaniu przycisku "szczegóły", bo nie ma go w navbarze
    if (nazwaSekcji !== 'szczegoly') {
        const docelowyPrzycisk = document.getElementById('btn-' + nazwaSekcji);
        if (docelowyPrzycisk) docelowyPrzycisk.classList.add('aktywny');
    }
    
    if (docelowaSekcja) docelowaSekcja.classList.add('aktywna');
}

// Generuje opcje dla dropdownu z kategoriami
function wygenerujKategorieDropdown() {
    const dropdown = document.getElementById('lista-kategorii-dropdown');
    dropdown.innerHTML = ''; 
    const kategorie = [...new Set(wszystkieProdukty.map(item => item.kategoria))];
    
    kategorie.forEach(kat => {
        const btn = document.createElement('button');
        btn.innerText = kat || 'Inne';
        btn.onclick = () => {
            document.getElementById('naglowek-kategorii').innerText = 'Kategoria: ' + (kat || 'Inne');
            zmienSekcje('kategorie');
            wyswietlKatalog(wszystkieProdukty.filter(p => p.kategoria === kat), 'katalog-filtrowany');
        };
        dropdown.appendChild(btn);
    });
}

// Uruchomienie przy starcie aplikacji
pobierzCennik();