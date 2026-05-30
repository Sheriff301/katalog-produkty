// 1. Ustawienia połączenia z Supabase
const supabaseUrl = 'https://prpycsgjzihsjmsqymyt.supabase.co'; 
const supabaseKey = 'sb_publishable_TZ4EklfptNyLtDmtC4ULHg_7PkZCteK'; // wklej swój klucz anon public

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Globalna zmienna na dane z bazy
let wszystkieProdukty = [];

// 2. Pobieranie danych z bazy
async function pobierzCennik() {
    const { data, error } = await supabaseClient
        .from('produkty') 
        .select('*');

    if (error) {
        console.error('Błąd połączenia z bazą:', error);
        document.getElementById('katalog-pojemnik').innerHTML = '<p style="color: red;">Nie udało się pobrać danych.</p>';
        return;
    }

    wszystkieProdukty = data;

    // Wyświetlenie wszystkich produktów na stronie głównej
    wyswietlKatalog(wszystkieProdukty, 'katalog-pojemnik');
    
    // Wygenerowanie elementów listy rozwijanej w menu
    wygenerujKategorieDropdown();
}

// 3. Funkcja generująca karty produktów ze zdjęciem, opisem i ceną
function wyswietlKatalog(produkty, docelowyPojemnikId) {
    const pojemnik = document.getElementById(docelowyPojemnikId);
    pojemnik.innerHTML = ''; 

    if (produkty.length === 0) {
        pojemnik.innerHTML = '<p style="color: #a8a8b3;">Brak przedmiotów w tej kategorii.</p>';
        return;
    }

    produkty.forEach(przedmiot => {
        const karta = document.createElement('div');
        karta.className = 'produkt-karta';
        
        // Zabezpieczenie przed brakiem zdjęcia - jeśli puste, daje szary placeholder
        const obrazek = przedmiot.zdjecie_url ? przedmiot.zdjecie_url : 'https://via.placeholder.com/280x200/202024/a8a8b3?text=Brak+Zdjecia';
        // Zabezpieczenie przed brakiem opisu
        const opisProduktu = przedmiot.opis ? przedmiot.opis : 'Brak dodatkowego opisu dla tego produktu.';

        karta.innerHTML = `
            <img src="${obrazek}" alt="${przedmiot.nazwa}">
            <div>
                <span class="kategoria">${przedmiot.kategoria || 'Inne'}</span>
                <h3>${przedmiot.nazwa}</h3>
                <p class="opis">${opisProduktu}</p>
            </div>
            <p class="cena">${przedmiot.cena} zł</p>
        `;
        
        pojemnik.appendChild(karta);
    });
}

// 4. Przełączanie sekcji podstron
function zmienSekcje(nazwaSekcji) {
    const sekcje = document.querySelectorAll('.sekcja');
    sekcje.forEach(sekcja => sekcja.classList.remove('aktywna'));

    const przyciskiMenu = document.querySelectorAll('nav > button, .dropdown-btn');
    przyciskiMenu.forEach(btn => btn.classList.remove('aktywny'));

    document.getElementById('sekcja-' + nazwaSekcji).classList.add('aktywna');
    document.getElementById('btn-' + nazwaSekcji).classList.add('aktywny');
}

// 5. Generowanie dynamicznego menu rozwijanego (Dropdown) na bazie kategorii z bazy
function wygenerujKategorieDropdown() {
    const dropdownContent = document.getElementById('lista-kategorii-dropdown');
    dropdownContent.innerHTML = ''; // czyszczenie napisu ładuję...

    // Pobranie unikalnych nazw kategorii z bazy danych
    const unikalneKategorie = [...new Set(wszystkieProdukty.map(item => item.kategoria))];

    if (unikalneKategorie.length === 0 || (unikalneKategorie.length === 1 && !unikalneKategorie[0])) {
        dropdownContent.innerHTML = '<button disabled>Brak kategorii w bazie</button>';
        return;
    }

    unikalneKategorie.forEach(kategoria => {
        const nazwaKat = kategoria ? kategoria : 'Inne'; 
        
        const btn = document.createElement('button');
        btn.innerText = nazwaKat;
        
        // Kliknięcie w element rozwijanego menu
        btn.onclick = () => {
            document.getElementById('naglowek-kategorii').innerText = 'Kategoria: ' + nazwaKat;
            zmienSekcje('kategorie'); // Otwórz sekcję filtrowaną
            filtrujPoKategorii(kategoria); // Przefiltruj dane
        };
        
        dropdownContent.appendChild(btn);
    });
}

// 6. Filtrowanie
function filtrujPoKategorii(wybranaKategoria) {
    const przefiltrowane = wszystkieProdukty.filter(przedmiot => przedmiot.kategoria === wybranaKategoria);
    wyswietlKatalog(przefiltrowane, 'katalog-filtrowany');
}

// Start skryptu
pobierzCennik();