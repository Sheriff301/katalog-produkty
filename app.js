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
        document.getElementById('katalog-pojemnik').innerHTML = '<p style="color: #ff5252;">Nie udało się pobrać danych z bazy. Sprawdź konsolę (F12).</p>';
        return;
    }

    wszystkieProdukty = data;
    wyswietlKatalog(wszystkieProdukty, 'katalog-pojemnik');
    wygenerujKategorieDropdown();
    aktualizujWidokKoszyka();
}

// 3. Wyświetlanie kart produktów w katalogu
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

// 4. Logika Koszyka
function dodajDoKoszyka(idProduktu) {
    const produktWKoszyku = koszyk.find(item => String(item.id) === String(idProduktu));
    
    if (produktWKoszyku) {
        produktWKoszyku.ilosc += 1;
        alert('Zwiększono ilość produktu w koszyku!');
    } else {
        const produktZBazy = wszystkieProdukty.find(item => String(item.id) === String(idProduktu));
        if (produktZBazy) {
            koszyk.push({
                id: produktZBazy.id,
                nazwa: produktZBazy.nazwa,
                cena: produktZBazy.cena,
                ilosc: 1
            });
            alert('Dodano produkt do koszyka!');
        } else {
            console.error("KRYTYCZNY BŁĄD: Nie znaleziono produktu o ID '" + idProduktu + "'.");
            alert('Wystąpił problem techniczny z ID produktu.');
        }
    }
    
    localStorage.setItem('koszyk', JSON.stringify(koszyk));
    aktualizujWidokKoszyka();
}

function zmienIlosc(idProduktu, zmiana) {
    const produkt = koszyk.find(item => String(item.id) === String(idProduktu));
    if (!produkt) return;

    produkt.ilosc += zmiana;

    if (produkt.ilosc <= 0) {
        koszyk = koszyk.filter(item => String(item.id) !== String(idProduktu));
    }

    localStorage.setItem('koszyk', JSON.stringify(koszyk));
    aktualizujWidokKoszyka();
}

function aktualizujWidokKoszyka() {
    const lacznaIlosc = koszyk.reduce((sum, item) => sum + item.ilosc, 0);
    document.getElementById('koszyk-licznik').innerText = lacznaIlosc;

    const listaPojemnik = document.getElementById('koszyk-lista-elementow');
    if (!listaPojemnik) return; 

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

// 5. OBSŁUGA ZAMÓWIENIA Z KODEM I PŁATNOŚCIĄ
function generujKodZamowienia() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

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
    
    const metodaPlatnosci = document.querySelector('input[name="metoda_platnosci"]:checked').value;
    const wygenerowanyKod = generujKodZamowienia();

    const pelneDaneKlienta = `Klient: ${nazwaKlienta}\nTelefon: ${telefonKlienta}\nAdres dostawy: ${adresKlienta}`;
    let tekstowaListaProduktow = koszyk.map(item => `${item.ilosc}x ${item.nazwa} (cena szt: ${item.cena} zł)`).join('\n');
    const sumaCalkowita = koszyk.reduce((sum, item) => sum + (item.cena * item.ilosc), 0);

    const { data, error } = await supabaseClient
        .from('zamowienia')
        .insert([
            {
                klient_dane: pelneDaneKlienta,
                produkty_lista: tekstowaListaProduktow,
                wartosc_calkowita: sumaCalkowita,
                status: 'Oczekujące na potwierdzenie',
                kod_zamowienia: wygenerowanyKod,
                metoda_platnosci: metodaPlatnosci
            }
        ]);

    if (error) {
        console.error('Błąd podczas składania zamówienia:', error);
        alert('Wystąpił problem techniczny podczas składania zamówienia. Spróbuj ponownie.');
        btnZatwierdz.innerText = 'Potwierdzam zamówienie';
        btnZatwierdz.disabled = false;
        return;
    }

    // Komunikat końcowy
    let wiadomoscSukces = `Dziękujemy! Zamówienie zostało pomyślnie złożone.\n\nTwój KOD ZAMÓWIENIA to: ${wygenerowanyKod}\nZapisz go, aby śledzić paczkę.`;
    
    if (metodaPlatnosci.includes("Przelew")) {
        wiadomoscSukces += `\n\n--- DANE DO PRZELEWU ---\nNr konta: 11 2222 3333 4444 5555 6666 7777\nKwota do zapłaty: ${sumaCalkowita.toFixed(2)} zł\nTytułem: Zamówienie ${wygenerowanyKod}`;
    }

    alert(wiadomoscSukces);
    
    // Czyszczenie koszyka i reset widoku
    koszyk = [];
    localStorage.removeItem('koszyk');
    document.getElementById('formularz-zamowienia').reset();
    aktualizujWidokKoszyka();
    
    // Przejście od razu do zakładki statusu i wpisanie tam kodu klienta
    zmienSekcje('status');
    document.getElementById('input-kod-zamowienia').value = wygenerowanyKod;

    btnZatwierdz.innerText = 'Potwierdzam zamówienie';
    btnZatwierdz.disabled = false;
}

// 6. SPRAWDZANIE STATUSU ZAMÓWIENIA
async function sprawdzStatusZamowienia() {
    const kod = document.getElementById('input-kod-zamowienia').value.trim().toUpperCase();
    const poleWyniku = document.getElementById('wynik-statusu');
    
    if (!kod) {
        alert('Proszę wpisać kod zamówienia.');
        return;
    }

    poleWyniku.style.display = 'block';
    poleWyniku.innerHTML = '<p style="color: #00e676;">Szukanie w bazie danych...</p>';

    const { data, error } = await supabaseClient
        .from('zamowienia')
        .select('status, wartosc_calkowita, metoda_platnosci, created_at')
        .eq('kod_zamowienia', kod);

    if (error) {
        console.error(error);
        poleWyniku.innerHTML = '<p style="color: #ff5252;">Wystąpił błąd połączenia z bazą.</p>';
        return;
    }

    if (data.length === 0) {
        poleWyniku.innerHTML = `
            <div class="status-box" style="border-left-color: #ff5252;">
                <strong>Brak wyników:</strong> Nie znaleziono zamówienia o kodzie <b>${kod}</b>. Upewnij się, że kod został wpisany poprawnie (bez spacji).
            </div>`;
    } else {
        const zamowienie = data[0];
        const dataZlozenia = new Date(zamowienie.created_at).toLocaleString('pl-PL');
        
        poleWyniku.innerHTML = `
            <div class="status-box">
                <h3 style="color: #00e676; margin-top: 0;">Status: ${zamowienie.status}</h3>
                <p><strong>Data złożenia:</strong> ${dataZlozenia}</p>
                <p><strong>Kwota do zapłaty:</strong> ${zamowienie.wartosc_calkowita} zł</p>
                <p><strong>Wybrana płatność:</strong> ${zamowienie.metoda_platnosci}</p>
                ${zamowienie.metoda_platnosci.includes('Przelew') 
                    ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #29292e; font-size: 0.9rem; color: #a8a8b3;">
                        Oczekujemy na płatność.<br>Nr konta: 11 2222 3333 4444 5555 6666 7777<br>Tytuł przelewu: <b>Zamówienie ${kod}</b>
                       </div>` 
                    : ''}
            </div>
        `;
    }
}

// 7. PRZEŁĄCZANIE SEKCJI MENU
function zmienSekcje(nazwaSekcji) {
    const sekcje = document.querySelectorAll('.sekcja');
    sekcje.forEach(sekcja => sekcja.classList.remove('aktywna'));

    const przyciskiMenu = document.querySelectorAll('nav > button, .dropdown-btn');
    przyciskiMenu.forEach(btn => btn.classList.remove('aktywny'));

    const elementSekcji = document.getElementById('sekcja-' + nazwaSekcji);
    if (elementSekcji) elementSekcji.classList.add('aktywna');

    const elementPrzycisku = document.getElementById('btn-' + nazwaSekcji);
    if (elementPrzycisku) elementPrzycisku.classList.add('aktywny');

    if (nazwaSekcji === 'koszyk') {
        aktualizujWidokKoszyka();
    }
}

// 8. GENEROWANIE KATEGORII W DROPDOWN
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

// Start skryptu przy uruchomieniu strony
pobierzCennik();