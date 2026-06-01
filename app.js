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

// Renderuje karty produktów (bez przycisku kupna)
function wyswietlKatalog(produkty, docelowyPojemnikId) {
    const pojemnik = document.getElementById(docelowyPojemnikId);
    pojemnik.innerHTML = ''; 
    
    produkty.forEach(przedmiot => {
        const karta = document.createElement('div');
        karta.className = 'produkt-karta';
        
        // Jeśli link jest pusty lub "popsuty", nie ładujemy go wcale
        const maPoprawnyObrazek = przedmiot.zdjecie_url && przedmiot.zdjecie_url.length > 10;
        const imgTag = maPoprawnyObrazek 
            ? `<img src="${przedmiot.zdjecie_url}" onerror="this.style.display='none'">`
            : `<div style="height:200px; background:#121214; display:flex; align-items:center; justify-content:center;">Brak zdjęcia</div>`;

        karta.innerHTML = `
            <div>
                ${imgTag}
                <span class="kategoria">${przedmiot.kategoria || 'Inne'}</span>
                <h3>${przedmiot.nazwa}</h3>
                <p class="opis">${przedmiot.opis || ''}</p>
            </div>
            <div>
                <p class="cena">${przedmiot.cena} zł</p>
            </div>
        `;
        pojemnik.appendChild(karta);
    });
}

// Obsługuje przełączanie widoku między zakładkami z nawigacji
function zmienSekcje(nazwaSekcji) {
    document.querySelectorAll('.sekcja').forEach(s => s.classList.remove('aktywna'));
    document.querySelectorAll('nav > button, .dropdown-btn').forEach(b => b.classList.remove('aktywny'));
    
    const docelowaSekcja = document.getElementById('sekcja-' + nazwaSekcji);
    const docelowyPrzycisk = document.getElementById('btn-' + nazwaSekcji);
    
    if (docelowaSekcja) docelowaSekcja.classList.add('aktywna');
    if (docelowyPrzycisk) docelowyPrzycisk.classList.add('aktywny');
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