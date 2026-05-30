// Ustawienia połączenia z Supabase
const supabaseUrl = 'https://prpycsgjzihsjmsqymyt.supabase.co'; 
const supabaseKey = 'TUTAJ_WKLEJ_SWÓJ_KLUCZ_SB_PUBLISHABLE'; // <--- WKLEJ TWÓJ KLUCZ PUBLICZNY SUPABASE

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let wszystkieProdukty = [];
let koszyk = JSON.parse(localStorage.getItem('koszyk')) || [];

// Pobieranie danych z bazy przy uruchomieniu strony
async function pobierzCennik() {
    const { data, error } = await supabaseClient.from('produkty').select('*');
    if (error) {
        document.getElementById('katalog-pojemnik').innerHTML = '<p style="color: red;">Błąd wczytywania katalogu.</p>';
        return;
    }
    wszystkieProdukty = data;
    wyswietlKatalog(wszystkieProdukty, 'katalog-pojemnik');
    wygenerujKategorieDropdown();
    aktualizujWidokKoszyka();
}

// Wyświetlanie produktów w siatce kart
function wyswietlKatalog(produkty, docelowyPojemnikId) {
    const pojemnik = document.getElementById(docelowyPojemnikId);
    pojemnik.innerHTML = ''; 
    if (produkty.length === 0) return pojemnik.innerHTML = '<p>Brak przedmiotów w tej kategorii.</p>';

    produkty.forEach(przedmiot => {
        const karta = document.createElement('div');
        karta.className = 'produkt-karta';
        const obrazek = przedmiot.zdjecie_url ? przedmiot.zdjecie_url : 'https://via.placeholder.com/280x200/202024/a8a8b3?text=Brak+Zdjecia';
        karta.innerHTML = `
            <div>
                <img src="${obrazek}" alt="${przedmiot.nazwa}">
                <span class="kategoria">${przedmiot.kategoria || 'Inne'}</span>
                <h3>${przedmiot.nazwa}</h3>
                <p class="opis">${przedmiot.opis || ''}</p>
            </div>
            <div>
                <p class="cena">${przedmiot.cena} zł</p>
                <button class="btn-akcja" style="width:100%; margin-top:10px;" onclick="dodajDoKoszyka('${przedmiot.id}')">Dodaj do koszyka</button>
            </div>
        `;
        pojemnik.appendChild(karta);
    });
}

// Dodawanie przedmiotu do koszyka
function dodajDoKoszyka(idProduktu) {
    const produktWKoszyku = koszyk.find(item => String(item.id) === String(idProduktu));
    if (produktWKoszyku) {
        produktWKoszyku.ilosc += 1;
    } else {
        const produktZBazy = wszystkieProdukty.find(item => String(item.id) === String(idProduktu));
        if (produktZBazy) {
            koszyk.push({ id: produktZBazy.id, nazwa: produktZBazy.nazwa, cena: produktZBazy.cena, ilosc: 1 });
        }
    }
    localStorage.setItem('koszyk', JSON.stringify(koszyk));
    aktualizujWidokKoszyka();
    alert('Dodano produkt do koszyka!');
}

// Zmiana ilości sztuk (+ / - / usuń)
function zmienIlosc(idProduktu, zmiana) {
    const produkt = koszyk.find(item => String(item.id) === String(idProduktu));
    if (!produkt) return;
    produkt.ilosc += zmiana;
    if (produkt.ilosc <= 0) koszyk = koszyk.filter(item => String(item.id) !== String(idProduktu));
    localStorage.setItem('koszyk', JSON.stringify(koszyk));
    aktualizujWidokKoszyka();
}

// Aktualizacja wyglądu koszyka HTML i licznika w menu
function aktualizujWidokKoszyka() {
    document.getElementById('koszyk-licznik').innerText = koszyk.reduce((sum, item) => sum + item.ilosc, 0);
    const listaPojemnik = document.getElementById('koszyk-lista-elementow');
    if (!listaPojemnik) return;
    listaPojemnik.innerHTML = '';
    
    let sumaCalkowita = 0;
    if (koszyk.length === 0) {
        listaPojemnik.innerHTML = '<p style="color: #a8a8b3;">Koszyk jest pusty.</p>';
        document.getElementById('koszyk-suma-kwota').innerText = '0.00';
        return;
    }

    koszyk.forEach(item => {
        const koszt = item.cena * item.ilosc;
        sumaCalkowita += koszt;
        listaPojemnik.innerHTML += `
            <div class="koszyk-element">
                <div class="koszyk-element-info">
                    <h4>${item.nazwa}</h4>
                    <p>${item.cena} zł x ${item.ilosc} = ${koszt.toFixed(2)} zł</p>
                </div>
                <div class="koszyk-kontrola">
                    <button type="button" onclick="zmienIlosc('${item.id}', -1)">-</button>
                    <span>${item.ilosc}</span>
                    <button type="button" onclick="zmienIlosc('${item.id}', 1)">+</button>
                    <button type="button" class="btn-usun" onclick="zmienIlosc('${item.id}', -${item.ilosc})">Usuń</button>
                </div>
            </div>`;
    });
    document.getElementById('koszyk-suma-kwota').innerText = sumaCalkowita.toFixed(2);
}

// Generowanie unikalnego kodu dla zamówienia (np. AB35ED)
function generujKodZamowienia() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Ukrywanie/Pokazywanie przycisków w zależności od wyboru: Stripe (BLIK) lub PayPal
function przelaczPrzyciskPlatnosci() {
    const wybranaMetoda = document.querySelector('input[name="metoda_platnosci"]:checked').value;
    const btnStripe = document.getElementById('btn-zatwierdz-zamowienie');
    const containerPayPal = document.getElementById('paypal-button-container');

    if (wybranaMetoda === 'PayPal') {
        btnStripe.style.display = 'none';
        containerPayPal.style.display = 'block';
    } else {
        btnStripe.style.display = 'block';
        containerPayPal.style.display = 'none';
    }
}

// --- OBSŁUGA STRIPE (BLIK) ---
async function wyslijZamowienie(event) {
    event.preventDefault(); 
    if (koszyk.length === 0) return alert('Koszyk jest pusty!');

    const btnZatwierdz = document.getElementById('btn-zatwierdz-zamowienie');
    btnZatwierdz.innerText = 'Łączenie z bramką płatności BLIK...';
    btnZatwierdz.disabled = true;

    const nazwaKlienta = document.getElementById('klient-nazwa').value;
    const telefonKlienta = document.getElementById('klient-telefon').value;
    const adresKlienta = document.getElementById('klient-adres').value;
    const wygenerowanyKod = generujKodZamowienia();

    const pelneDaneKlienta = `Klient: ${nazwaKlienta}\nTel: ${telefonKlienta}\nAdres: ${adresKlienta}`;
    let tekstowaListaProduktow = koszyk.map(item => `${item.ilosc}x ${item.nazwa}`).join('\n');
    const sumaCalkowita = koszyk.reduce((sum, item) => sum + (item.cena * item.ilosc), 0);

    // Krok A: Zapisujemy zamówienie w Supabase jako "Oczekujące na płatność"
    const { error } = await supabaseClient.from('zamowienia').insert([{
        klient_dane: pelneDaneKlienta,
        produkty_lista: tekstowaListaProduktow,
        wartosc_calkowita: sumaCalkowita,
        status: 'Oczekujące na płatność',
        kod_zamowienia: wygenerowanyKod,
        metoda_platnosci: 'BLIK / Bramka Online'
    }]);

    if (error) {
        alert('Wystąpił błąd bazy danych. Spróbuj ponownie.');
        btnZatwierdz.innerText = 'Zapłać przez BLIK / Bramkę Online';
        btnZatwierdz.disabled = false;
        return;
    }

    // Krok B: Wywołujemy Deno Edge Function w Supabase, aby wygenerować link Stripe (z BLIKiem)
    try {
        const { data, error: functionError } = await supabaseClient.functions.invoke('stworz-platnosc-stripe', {
            body: { 
                koszyk: koszyk, 
                kod_zamowienia: wygenerowanyKod 
            }
        });

        if (functionError) throw functionError;

        // Krok C: Jeśli funkcja przekazała URL płatności, przenosimy tam klienta!
        if (data && data.url) {
            window.location.href = data.url;
        } else {
            throw new Error("Brak adresu URL płatności");
        }
    } catch (err) {
        console.error(err);
        alert('Zamówienie zapisane, ale nie udało się otworzyć płatności online. Możesz sprawdzić status zamówienia kodem: ' + wygenerowanyKod);
        btnZatwierdz.innerText = 'Zapłać przez BLIK / Bramkę Online';
        btnZatwierdz.disabled = false;
    }
}

// --- OBSŁUGA PAYPAL (Smart Buttons) ---
paypal.Buttons({
    createOrder: function(data, actions) {
        if (koszyk.length === 0) {
            alert('Twój koszyk jest pusty!');
            return actions.reject();
        }
        // Pobieramy kwotę z koszyka do okienka PayPal
        const kwota = document.getElementById('koszyk-suma-kwota').innerText;
        return actions.order.create({
            purchase_units: [{
                amount: { value: kwota }
            }]
        });
    },
    onApprove: async function(data, actions) {
        // Klient zatwierdził płatność w systemie PayPal
        const szczegoly = await actions.order.capture();

        const nazwaKlienta = document.getElementById('klient-nazwa').value || szczegoly.payer.name.given_name + " " + szczegoly.payer.name.surname;
        const telefonKlienta = document.getElementById('klient-telefon').value || "Nie podano";
        const adresKlienta = document.getElementById('klient-adres').value || "Pobrane z PayPal";
        const wygenerowanyKod = generujKodZamowienia();

        const pelneDaneKlienta = `Klient: ${nazwaKlienta}\nTel: ${telefonKlienta}\nAdres: ${adresKlienta}`;
        let tekstowaListaProduktow = koszyk.map(item => `${item.ilosc}x ${item.nazwa}`).join('\n');
        const sumaCalkowita = koszyk.reduce((sum, item) => sum + (item.cena * item.ilosc), 0);

        // Zapisujemy zamówienie od razu jako "Opłacone"
        await supabaseClient.from('zamowienia').insert([{
            klient_dane: pelneDaneKlienta,
            produkty_lista: tekstowaListaProduktow,
            wartosc_calkowita: sumaCalkowita,
            status: 'Opłacone (PayPal)',
            kod_zamowienia: wygenerowanyKod,
            metoda_platnosci: 'PayPal'
        }]);

        alert(`Płatność PayPal zaakceptowana!\nTwój kod zamówienia to: ${wygenerowanyKod}`);
        
        // Czyszczenie koszyka
        koszyk = [];
        localStorage.removeItem('koszyk');
        document.getElementById('formularz-zamowienia').reset();
        aktualizujWidokKoszyka();
        zmienSekcje('status');
        document.getElementById('input-kod-zamowienia').value = wygenerowanyKod;
        sprawdzStatusZamowienia();
    },
    onError: function(err) {
        console.error(err);
        alert('Wystąpił błąd podczas autoryzacji płatności PayPal.');
    }
}).render('#paypal-button-container');

// --- SPRAWDZANIE STATUSU ---
async function sprawdzStatusZamowienia() {
    const kod = document.getElementById('input-kod-zamowienia').value.trim().toUpperCase();
    const poleWyniku = document.getElementById('wynik-statusu');
    
    if (!kod) return alert('Wpisz najpierw kod zamówienia!');

    poleWyniku.style.display = 'block';
    poleWyniku.innerHTML = '<p style="color: #00e676;">Szukanie w bazie danych...</p>';

    const { data, error } = await supabaseClient
        .from('zamowienia')
        .select('status, wartosc_calkowita, metoda_platnosci, created_at')
        .eq('kod_zamowienia', kod);

    if (error) {
        poleWyniku.innerHTML = '<p style="color: red;">Wystąpił błąd połączenia z bazą.</p>';
        return;
    }

    if (data.length === 0) {
        poleWyniku.innerHTML = '<div class="status-box" style="border-color: #ff5252;"><strong>Błąd:</strong> Nie znaleziono zamówienia o kodzie ' + kod + '. Sprawdź, czy nie ma literówki.</div>';
    } else {
        const zamowienie = data[0];
        const dataZlozenia = new Date(zamowienie.created_at).toLocaleString('pl-PL');
        
        poleWyniku.innerHTML = `
            <div class="status-box">
                <h3 style="color: #00e676; margin-top: 0;">Status: ${zamowienie.status}</h3>
                <p><strong>Data złożenia:</strong> ${dataZlozenia}</p>
                <p><strong>Kwota zamówienia:</strong> ${zamowienie.wartosc_calkowita} zł</p>
                <p><strong>Metoda płatności:</strong> ${zamannienie.metoda_platnosci || zamowienie.metoda_platnosci}</p>
            </div>
        `;
    }
}

// Nawigacja sekcjami na stronie
function zmienSekcje(nazwaSekcji) {
    document.querySelectorAll('.sekcja').forEach(s => s.classList.remove('aktywna'));
    document.querySelectorAll('nav > button, .dropdown-btn').forEach(b => b.classList.remove('aktywny'));
    
    const docelowaSekcja = document.getElementById('sekcja-' + nazwaSekcji);
    const docelowyPrzycisk = document.getElementById('btn-' + nazwaSekcji);
    
    if (docelowaSekcja) docelowaSekcja.classList.add('aktywna');
    if (docelowyPrzycisk) docelowyPrzycisk.classList.add('aktywny');
    
    if (nazwaSekcji === 'koszyk') aktualizujWidokKoszyka();
}

// Generowanie listy kategorii w rozwijanym menu
function wygenerujKategorieDropdown() {
    const dropdown = document.getElementById('lista-kategorii-dropdown');
    dropdown.innerHTML = ''; 
    const kategorie = [...new Set(wszystkieProdukty.map(item => item.kategoria))];
    if (kategorie.length === 0 || (kategorie.length === 1 && !kategorie[0])) return dropdown.innerHTML = '<button disabled>Brak</button>';
    
    kategorie.forEach(kat => {
        const nazwaKat = kat || 'Inne'; 
        const btn = document.createElement('button');
        btn.innerText = nazwaKat;
        btn.onclick = () => {
            document.getElementById('naglowek-kategorii').innerText = 'Kategoria: ' + nazwaKat;
            zmienSekcje('kategorie');
            wyswietlKatalog(wszystkieProdukty.filter(p => p.kategoria === kat), 'katalog-filtrowany');
        };
        dropdown.appendChild(btn);
    });
}

// Nasłuchiwanie na powrót ze Stripe (Sukces płatności BLIK)
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'sukces' && params.get('kod')) {
        const kodZStripe = params.get('kod');
        alert(`Dziękujemy za dokonanie płatności BLIK!\nTwoje zamówienie zostało przekazane do realizacji.\nTwój kod: ${kodZStripe}`);
        
        // Czyszczenie koszyka po udanej płatności
        koszyk = [];
        localStorage.removeItem('koszyk');
        aktualizujWidokKoszyka();
        
        // Przenosimy użytkownika od razu do zakładki statusu i wpisujemy kod
        zmienSekcje('status');
        document.getElementById('input-kod-zamowienia').value = kodZStripe;
        sprawdzStatusZamowienia();
        
        // Czyszczenie paska URL z parametrów sukcesu
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// Uruchomienie aplikacji
pobierzCennik();