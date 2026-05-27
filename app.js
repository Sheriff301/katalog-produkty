// 1. Ustawienia połączenia z Supabase
const supabaseUrl = 'TUTAJ_WKLEJ_SWÓJ_URL'; 
const supabaseKey = 'TUTAJ_WKLEJ_SWÓJ_KLUCZ_SB_PUBLISHABLE';

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Globalna zmienna do przechowywania wszystkich produktów pobranych z bazy
let wszystkieProdukty = [];

// 2. Funkcja, która wyciąga dane z tabeli
async function pobierzCennik() {
    const { data, error } = await supabaseClient
        .from('produkty') 
        .select('*');

    if (error) {
        console.error('Błąd połączenia z bazą:', error);
        document.getElementById('katalog-pojemnik').innerHTML = '<p style="color: red;">Nie udało się pobrać danych.</p>';
        return;
    }

    // Zapisujemy pobrane dane do naszej zmiennej
    wszystkieProdukty = data;

    // Wyświetlamy wszystko w pierwszej zakładce
    wyswietlKatalog(wszystkieProdukty, 'katalog-pojemnik');
    
    // Generujemy przyciski w zakładce "Kategorie"
    wygenerujKategorie();
}

// 3. Funkcja generująca HTML dla przedmiotów w konkretnym miejscu na stronie
function wyswietlKatalog(produkty, docelowyPojemnikId) {
    const pojemnik = document.getElementById(docelowyPojemnikId);
    pojemnik.innerHTML = ''; 

    // Upewniamy się, że pojemnik ma styl "grid" z CSS (dla przefiltrowanych)
    pojemnik.style.display = 'grid';
    pojemnik.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
    pojemnik.style.gap = '20px';

    if (produkty.length === 0) {
        pojemnik.innerHTML = '<p>Brak przedmiotów w cenniku.</p>';
        return;
    }

    produkty.forEach(przedmiot => {
        const karta = document.createElement('div');
        karta.className = 'produkt-karta';
        
        karta.innerHTML = `
            <h3>${przedmiot.nazwa}</h3>
            <span class="kategoria">${przedmiot.kategoria || 'Inne'}</span>
            <p class="cena">${przedmiot.cena} zł</p>
        `;
        
        pojemnik.appendChild(karta);
    });
}

// ==========================================
// NOWE FUNKCJE DLA APLIKACJI
// ==========================================

// Przełączanie sekcji (zakładek) w menu
function zmienSekcje(nazwaSekcji) {
    // Ukryj wszystkie sekcje
    const sekcje = document.querySelectorAll('.sekcja');
    sekcje.forEach(sekcja => sekcja.classList.remove('aktywna'));

    // Zresetuj wygląd przycisków w menu
    const przyciskiMenu = document.querySelectorAll('nav button');
    przyciskiMenu.forEach(btn => btn.classList.remove('aktywny'));

    // Pokaż wybraną sekcję i podświetl przycisk
    document.getElementById('sekcja-' + nazwaSekcji).classList.add('aktywna');
    document.getElementById('btn-' + nazwaSekcji).classList.add('aktywny');
}

// Pobieranie unikalnych kategorii z bazy i tworzenie przycisków
function wygenerujKategorie() {
    const pojemnikKategorii = document.getElementById('lista-kategorii');
    pojemnikKategorii.innerHTML = ''; // czyszczenie

    // Pobieramy same nazwy kategorii z naszych produktów (usuwamy duplikaty dzięki 'Set')
    const unikalneKategorie = [...new Set(wszystkieProdukty.map(item => item.kategoria))];

    if (unikalneKategorie.length === 0) {
        pojemnikKategorii.innerHTML = '<p>Brak przypisanych kategorii w bazie.</p>';
        return;
    }

    // Tworzymy przycisk dla każdej kategorii
    unikalneKategorie.forEach(kategoria => {
        // Zabezpieczenie na wypadek produktów bez kategorii
        const nazwaKat = kategoria ? kategoria : 'Inne'; 
        
        const btn = document.createElement('button');
        btn.className = 'przycisk-kat';
        btn.innerText = nazwaKat;
        
        // Co ma się stać po kliknięciu w kategorię?
        btn.onclick = () => {
            filtrujPoKategorii(kategoria);
        };
        
        pojemnikKategorii.appendChild(btn);
    });
}

// Pokazywanie tylko produktów z klikniętej kategorii
function filtrujPoKategorii(wybranaKategoria) {
    // Tworzymy nową listę tylko z produktami pasującymi do kategorii
    const przefiltrowane = wszystkieProdukty.filter(przedmiot => przedmiot.kategoria === wybranaKategoria);
    
    // Wyświetlamy je w specjalnym pojemniku pod przyciskami kategorii
    wyswietlKatalog(przefiltrowane, 'katalog-filtrowany');
}

// Uruchomienie pobierania na start
pobierzCennik();