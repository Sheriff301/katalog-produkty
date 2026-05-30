const supabaseUrl = 'https://prpycsgjzihsjmsqymyt.supabase.co'; 
const supabaseKey = 'sb_publishable_TZ4EklfptNyLtDmtC4ULHg_7PkZCteK'; 

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let wszystkieProdukty = [];
let koszyk = JSON.parse(localStorage.getItem('koszyk')) || [];

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

function wyswietlKatalog(produkty, docelowyPojemnikId) {
    const pojemnik = document.getElementById(docelowyPojemnikId);
    pojemnik.innerHTML = ''; 
    if (produkty.length === 0) return pojemnik.innerHTML = '<p>Brak przedmiotów w tej kategorii.</p>';

    produkty.forEach(przedmiot => {
        const karta = document.createElement('div');
        karta.className = 'produkt-karta';
        
        // ZABEZPIECZENIE: Sprawdzamy czy url zaczyna się od http, jeśli nie - używamy placehold.co
        let obrazek = przedmiot.zdjecie_url;
        if (!obrazek || !obrazek.startsWith('http')) {
            obrazek = 'https://placehold.co/280x200/202024/a8a8b3?text=Brak+Zdjecia';
        }
        
        karta.innerHTML = `
            <div>
                <img src="${obrazek}" alt="${przedmiot.nazwa}" onerror="this.src='https://placehold.co/280x200/202024/a8a8b3?text=Blad+Obrazka'">
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

function zmienIlosc(idProduktu, zmiana) {
    const produkt = koszyk.find(item => String(item.id) === String(idProduktu));
    if (!produkt) return;
    produkt.ilosc += zmiana;
    if (produkt.ilosc <= 0) koszyk = koszyk.filter(item => String(item.id) !== String(idProduktu));
    localStorage.setItem('koszyk', JSON.stringify(koszyk));
    aktualizujWidokKoszyka();
}

function aktualizujWidokKoszyka() {
    const licznik = document.getElementById('koszyk-licznik');
    if (licznik) licznik.innerText = koszyk.reduce((sum, item) => sum + item.ilosc, 0);
    
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

function generujKodZamowienia() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// --- OBSŁUGA PAYPAL ---
// --- OBSŁUGA PAYPAL ---
paypal.Buttons({
    createOrder: function(data, actions) {
        // 1. Obliczamy sumę bezpośrednio z tablicy koszyk
        const suma = koszyk.reduce((sum, item) => sum + (item.cena * item.ilosc), 0);
        
        // 2. Walidacja: Jeśli suma jest 0 lub mniej, blokujemy transakcję
        if (suma <= 0) {
            alert('Twój koszyk jest pusty. Dodaj produkty, aby kontynuować płatność.');
            return; // Przerywamy działanie
        }

        // 3. Tworzymy zamówienie z obliczoną sumą
        return actions.order.create({
            purchase_units: [{
                amount: {
                    currency_code: 'PLN',
                    value: suma.toFixed(2) // Zamieniamy liczbę na string z dwoma miejscami po przecinku
                }
            }]
        });
    },
    onApprove: async function(data, actions) {
        const szczegoly = await actions.order.capture();
        const nazwaKlienta = document.getElementById('klient-nazwa').value;
        const telefonKlienta = document.getElementById('klient-telefon').value;
        const adresKlienta = document.getElementById('klient-adres').value;
        
        if(!nazwaKlienta || !telefonKlienta || !adresKlienta) {
            alert('Proszę wypełnić dane kontaktowe przed dokonaniem płatności!');
            return;
        }

        const wygenerowanyKod = generujKodZamowienia();
        const pelneDaneKlienta = `Klient: ${nazwaKlienta}\nTel: ${telefonKlienta}\nAdres: ${adresKlienta}`;
        let tekstowaListaProduktow = koszyk.map(item => `${item.ilosc}x ${item.nazwa}`).join('\n');
        const sumaCalkowita = koszyk.reduce((sum, item) => sum + (item.cena * item.ilosc), 0);

        await supabaseClient.from('zamowienia').insert([{
            klient_dane: pelneDaneKlienta,
            produkty_lista: tekstowaListaProduktow,
            wartosc_calkowita: sumaCalkowita,
            status: 'Opłacone (PayPal)',
            kod_zamowienia: wygenerowanyKod,
            metoda_platnosci: 'PayPal'
        }]);

        alert(`Płatność zaakceptowana! Twój kod: ${wygenerowanyKod}`);
        koszyk = [];
        localStorage.removeItem('koszyk');
        aktualizujWidokKoszyka();
        zmienSekcje('status');
        document.getElementById('input-kod-zamowienia').value = wygenerowanyKod;
        sprawdzStatusZamowienia();
    }
}).render('#paypal-button-container');

async function sprawdzStatusZamowienia() {
    const kod = document.getElementById('input-kod-zamowienia').value.trim().toUpperCase();
    const poleWyniku = document.getElementById('wynik-statusu');
    
    if (!kod) return alert('Wpisz kod zamówienia!');

    poleWyniku.style.display = 'block';
    poleWyniku.innerHTML = '<p style="color: #00e676;">Szukanie w bazie...</p>';

    const { data, error } = await supabaseClient
        .from('zamowienia')
        .select('status, wartosc_calkowita, metoda_platnosci, created_at')
        .eq('kod_zamowienia', kod);

    if (error || data.length === 0) {
        poleWyniku.innerHTML = '<p style="color: #ff5252;">Nie znaleziono zamówienia.</p>';
    } else {
        const z = data[0];
        poleWyniku.innerHTML = `
            <div class="status-box">
                <h3 style="color: #00e676;">Status: ${z.status}</h3>
                <p>Kwota: ${z.wartosc_calkowita} zł</p>
                <p>Metoda: ${z.metoda_platnosci}</p>
            </div>
        `;
    }
}

function zmienSekcje(nazwaSekcji) {
    document.querySelectorAll('.sekcja').forEach(s => s.classList.remove('aktywna'));
    document.querySelectorAll('nav > button, .dropdown-btn').forEach(b => b.classList.remove('aktywny'));
    const docelowaSekcja = document.getElementById('sekcja-' + nazwaSekcji);
    const docelowyPrzycisk = document.getElementById('btn-' + nazwaSekcji);
    if (docelowaSekcja) docelowaSekcja.classList.add('aktywna');
    if (docelowyPrzycisk) docelowyPrzycisk.classList.add('aktywny');
}

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

pobierzCennik();