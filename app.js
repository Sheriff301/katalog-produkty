// 1. Ustawienia połączenia z Supabase
const supabaseUrl = 'https://prpycsgjzihsjmsqymyt.supabase.co'; 
const supabaseKey = 'sb_publishable_TZ4EklfptNyLtDmtC4ULHg_7PkZCteK'; // <--- WKLEJ TU SWÓJ KLUCZ (sb_publishable...)

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Globalne zmienne
let wszystkieProdukty = [];
let koszyk = JSON.parse(localStorage.getItem('koszyk')) || [];

// 2. Pobieranie danych o produktach z bazy
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

    wyswietlKatalog(wszystkieProdukty, 'katalog-pojemnik');
    wygenerujKategorieDropdown();
    aktualizujWidokKoszyka(); // odświeżenie licznika koszyka na starcie
}

// 3. Wyświetlanie kart produktów w katalogu z przyciskiem "Dodaj do koszyka"
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
        
        const obrazek = przedmiot.zdjecie_url ? przedmiot.zdjecie_url : 'https://via.placeholder.com/280x200/202024/a8a8b3?text=Brak+Zdjecia';
        const opisProduktu = przedmiot.opis ? przedmiot.opis : 'Brak dodatkowego opisu dla tego produktu.';

        karta.innerHTML = `
            <div>
                <img src="${obrazek}" alt="${przedmiot.nazwa}">
                <span class="kategoria">${przedmiot.kategoria || 'Inne'}</span>
                <h3>${przedmiot.nazwa}</h3>
                <p class="opis">${opisProduktu}</p>
            </div>
            <div>
                <p class="cena">${przedmiot.cena} zł</p>
                <button class="btn-akcja" onclick="dodajDoKoszyka('${przedmiot.id}')">Dodaj do koszyka</button>
            </div>
        `;
        
        pojemnik.appendChild(karta);
    });
}

// 4. Logika Koszyka - Dodawanie produktów (ZAKTUALIZOWANA WERSJA)
function dodajDoKoszyka(idProduktu) {
    console.log("--- PROCES DODAWANIA DO KOSZYKA ---");
    console.log("Kliknięte ID produktu z przycisku:", idProduktu);
    console.log("Lista wszystkich produktów załadowanych z Supabase:", wszystkieProdukty);

    // Szukamy czy produkt jest już w koszyku (konwertujemy na String dla 100% pewności dopasowania)
    const produktWKoszyku = koszyk.find(item => String(item.id) === String(idProduktu));
    
    if (produktWKoszyku) {
        produktWKoszyku.ilosc += 1;
        localStorage.setItem('koszyk', JSON.stringify(koszyk));
        aktualizujWidokKoszyka();
        alert('Zwiększono ilość produktu w koszyku!');
    } else {
        // Jeśli przedmiotu nie ma w koszyku, szukamy go w liście pobranej z bazy danych
        const produktZBazy = wszystkieProdukty.find(item => String(item.id) === String(idProduktu));
        
        if (produktZBazy) {
            koszyk.push({
                id: produktZBazy.id,
                nazwa: produktZBazy.nazwa,
                cena: produktZBazy.cena,
                ilosc: 1
            });
            localStorage.setItem('koszyk', JSON.stringify(koszyk));
            aktualizujWidokKoszyka();
            alert('Dodano produkt do koszyka!');
        } else {
            // Jeśli skrypt trafi tutaj, oznacza to, że kliknięte ID nie pasuje do żadnego ID z tabeli Supabase
            console.error("KRYTYCZNY BŁĄD: Nie znaleziono produktu o ID '" + idProduktu + "' na liście pobranej z bazy danych!");
            alert('Wystąpił problem techniczny z ID produktu. Otwórz konsolę (klawisz F12), aby sprawdzić błędy.');
        }
    }
}

// Zmiana ilości sztuk w koszyku
function zmienIlosc(idProduktu, zmiana) {
    const produkt = koszyk.find(item => String(item.id) === String(idProduktu));
    if (!produkt) return;

    produkt.ilosc += zmiana;

    if (produkt.ilosc <= 0) {
        // Usuń jeśli ilość spadnie do zera
        koszyk = koszyk.filter(item => String(item.id) !== String(idProduktu));
    }

    localStorage.setItem('koszyk', JSON.stringify(koszyk));
    aktualizujWidokKoszyka();
}

// Aktualizacja widoku, sum i liczników
function aktualizujWidokKoszyka() {
    // 1. Licznik w menu nawigacyjnym
    const lacznaIlosc = koszyk.reduce((sum, item) => sum + item.ilosc, 0);
    document.getElementById('koszyk-licznik').innerText = lacznaIlosc;

    // 2. Generowanie listy w sekcji koszyka
    const listaPojemnik = document.getElementById('koszyk-lista-elementow');
    if (!listaPojemnik) return; // zabezpieczenie przed błędami

    listaPojemnik.innerHTML = '';
    let sumaCalkowita = 0;

    if (koszyk.length === 0) {
        listaPojemnik.innerHTML = '<p style="color: #a8a8b3; padding: 20px 0;">Twój koszyk jest pusty.</p>';
        document.getElementById('koszyk-suma-kwota').innerText = '0.00';
        return;
    }

    koszyk.forEach(item => {
        const kosztPrzedmiotow = item.cena * item.ilosc;
        sumaCalkowita += kosztPrzedmiotow;

        const el = document.createElement('div');
        el.className = 'koszyk-element';
        el.innerHTML = `
            <div class="koszyk-element-info">
                <h4>${item.nazwa}</h4>
                <p>${item.cena} zł x ${item.ilosc} = ${kosztPrzedmiotow.toFixed(2)} zł</p>
            </div>
            <div class="koszyk-kontrola">
                <button onclick="zmienIlosc('${item.id}', -1)">-</button>
                <span>${item.ilosc}</span>
                <button onclick="zmienIlosc('${item.id}', 1)">+</button>
                <button class="btn-usun" onclick="zmienIlosc('${item.id}', -${item.ilosc})">Usuń</button>
            </div>
        `;
        listaPojemnik.appendChild(el);
    });

    document.getElementById('koszyk-suma-kwota').innerText = sumaCalkowita.toFixed(2);
}

// 5. OBSŁUGA ZAMÓWIENIA - WYSYŁKA DO SUPABASE
async function wyslijZamowienie(event) {
    event.preventDefault(); 

    if (koszyk.length === 0) {
        alert('Twój koszyk jest pusty! Dodaj produkty przed złożeniem zamówienia.');
        return;
    }

    const btnZatwierdz = document.getElementById('btn-zatwierdz-zamowienie');
    btnZatwierdz.innerText = 'Wysyłanie zamówienia...';
    btnZatwierdz.disabled = true;

    const nazwaKlienta = document.getElementById('klient-nazwa').value;
    const telefonKlienta = document.getElementById('klient-telefon').value;
    const adresKlienta = document.getElementById('klient-adres').value;
    const uwagiKlienta = document.getElementById('klient-uwagi').value;

    const pelneDaneKlienta = `Klient/Firma: ${nazwaKlienta}\nTelefon: ${telefonKlienta}\nAdres dostawy: ${adresKlienta}\nUwagi: ${uwagiKlienta}`;

    let tekstowaListaProduktow = koszyk.map(item => `${item.ilosc}x ${item.nazwa} (cena szt: ${item.cena} zł)`).join('\n');
    
    const sumaCalkowita = koszyk.reduce((sum, item) => sum + (item.cena * item.ilosc), 0);

    const { data, error } = await supabaseClient
        .from('zamowienia')
        .insert([
            {
                klient_dane: pelneDaneKlienta,
                produkty_lista: tekstowaListaProduktow,
                wartosc_calkowita: sumaCalkowita,
                status: 'Nowe'
            }
        ]);

    if (error) {
        console.error('Błąd podczas składania zamówienia:', error);
        alert('Wystąpił problem techniczny podczas składania zamówienia. Spróbuj ponownie.');
        btnZatwierdz.innerText = 'Złóż zamówienie (Kupuję)';
        btnZatwierdz.disabled = false;
        return;
    }

    alert('Dziękujemy! Twoje zamówienie zostało pomyślnie złożone i przekazane do realizacji.');
    
    koszyk = [];
    localStorage.removeItem('koszyk');
    document.getElementById('formularz-zamowienia').reset();
    
    aktualizujWidokKoszyka();
    zmienSekcje('cennik');

    btnZatwierdz.innerText = 'Złóż zamówienie (Kupuję)';
    btnZatwierdz.disabled = false;
}

// 6. Przełączanie sekcji podstron
function zmienSekcje(nazwaSekcji) {
    const sekcje = document.querySelectorAll('.sekcja');
    sekcje.forEach(sekcja => sekcja.classList.remove('aktywna'));

    const przyciskiMenu = document.querySelectorAll('nav > button, .dropdown-btn');
    przyciskiMenu.forEach(btn => btn.classList.remove('aktywny'));

    document.getElementById('sekcja-' + nazwaSekcji).classList.add('aktywna');
    document.getElementById('btn-' + nazwaSekcji).classList.add('aktywny');

    if (nazwaSekcji === 'koszyk') {
        aktualizujWidokKoszyka();
    }
}

// 7. Generowanie dynamicznego menu rozwijanego (Dropdown)
function wygenerujKategorieDropdown() {
    const dropdownContent = document.getElementById('lista-kategorii-dropdown');
    dropdownContent.innerHTML = ''; 

    const unikalneKategorie = [...new Set(wszystkieProdukty.map(item => item.kategoria))];

    if (unikalneKategorie.length === 0 || (unikalneKategorie.length === 1 && !unikalneKategorie[0])) {
        dropdownContent.innerHTML = '<button disabled>Brak kategorii w bazie</button>';
        return;
    }

    unikalneKategorie.forEach(kategoria => {
        const nazwaKat = kategoria ? kategoria : 'Inne'; 
        const btn = document.createElement('button');
        btn.innerText = nazwaKat;
        
        btn.onclick = () => {
            document.getElementById('naglowek-kategorii').innerText = 'Kategoria: ' + nazwaKat;
            zmienSekcje('kategorie');
            filtrujPoKategorii(kategoria);
        };
        
        dropdownContent.appendChild(btn);
    });
}

function filtrujPoKategorii(wybranaKategoria) {
    const przefiltrowane = wszystkieProdukty.filter(przedmiot => przedmiot.kategoria === wybranaKategoria);
    wyswietlKatalog(przefiltrowane, 'katalog-filtrowany');
}

// Start skryptu
pobierzCennik();