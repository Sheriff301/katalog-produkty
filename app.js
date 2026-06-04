const supabaseUrl = 'https://prpycsgjzihsjmsqymyt.supabase.co'; 
const supabaseKey = 'sb_publishable_TZ4EklfptNyLtDmtC4ULHg_7PkZCteK'; 

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let wszystkieProdukty = [];
let koszyk = []; // Pusta tablica trzymająca produkty w koszyku

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
        
        const maPoprawnyObrazek = przedmiot.zdjecie_url && przedmiot.zdjecie_url.length > 10;
        const imgTag = maPoprawnyObrazek 
            ? `<img src="${przedmiot.zdjecie_url}" onerror="this.style.display='none'" onclick="pokazSzczegoly('${przedmiot.id}')">`
            : `<div style="height:200px; background:#121214; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="pokazSzczegoly('${przedmiot.id}')">Brak zdjęcia</div>`;

        karta.innerHTML = `
            <div>
                ${imgTag}
                <span class="kategoria">${przedmiot.kategoria || 'Inne'}</span>
                <h3 onclick="pokazSzczegoly('${przedmiot.id}')">${przedmiot.nazwa}</h3>
                <p class="opis">${przedmiot.opis || 'Brak opisu...'}</p>
            </div>
            <div style="margin-top: 15px;">
                <p class="cena">${przedmiot.cena} zł</p>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button class="btn-akcja" style="flex:1;" onclick="pokazSzczegoly('${przedmiot.id}')">Szczegóły</button>
                    <button class="btn-akcja" style="flex:1; background-color:#2196F3; color:white;" onclick="dodajDoKoszyka('${przedmiot.id}')">🛒 Dodaj</button>
                </div>
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
                <button class="btn-akcja" style="margin-top: 20px; font-size:1.1rem; background-color:#2196F3; color:white;" onclick="dodajDoKoszyka('${produkt.id}')">🛒 Dodaj do koszyka</button>
            </div>
        </div>
    `;

    zmienSekcje('szczegoly');
}

// ---- LOGIKA KOSZYKA ----

function dodajDoKoszyka(id) {
    const produkt = wszystkieProdukty.find(p => String(p.id) === String(id));
    if (!produkt) return;

    const istniejacy = koszyk.find(p => String(p.id) === String(id));
    if (istniejacy) {
        istniejacy.ilosc += 1;
    } else {
        koszyk.push({ ...produkt, ilosc: 1 });
    }
    
    aktualizujWidokKoszyka();
    // Pokaz powiadomienie (możesz zmienić na ładniejszy alert)
    alert(`Dodano: ${produkt.nazwa}`); 
}

function zmienIloscKoszyka(id, zmiana) {
    const element = koszyk.find(p => String(p.id) === String(id));
    if (!element) return;

    element.ilosc += zmiana;
    if (element.ilosc <= 0) {
        koszyk = koszyk.filter(p => String(p.id) !== String(id));
    }
    aktualizujWidokKoszyka();
}

function aktualizujWidokKoszyka() {
    const licznik = document.getElementById('koszyk-licznik');
    const listaPojemnik = document.getElementById('koszyk-lista-elementow');
    const panelZamowienia = document.getElementById('panel-zamowienia');
    const sumaKwota = document.getElementById('koszyk-suma-kwota');

    let sumaCalkowita = 0;
    let sumaIlosc = 0;

    listaPojemnik.innerHTML = '';

    if (koszyk.length === 0) {
        listaPojemnik.innerHTML = '<p style="color: #a8a8b3;">Twój koszyk jest obecnie pusty.</p>';
        panelZamowienia.classList.add('ukryty');
        licznik.innerText = '0';
        return;
    }

    panelZamowienia.classList.remove('ukryty');

    koszyk.forEach(item => {
        const koszt = item.cena * item.ilosc;
        sumaCalkowita += koszt;
        sumaIlosc += item.ilosc;

        listaPojemnik.innerHTML += `
            <div class="koszyk-element">
                <div>
                    <h4 style="margin: 0 0 5px 0; color: #fff;">${item.nazwa}</h4>
                    <span style="color: #a8a8b3; font-size: 0.9rem;">Cena szt: ${item.cena} zł | Łącznie: ${koszt.toFixed(2)} zł</span>
                </div>
                <div class="koszyk-kontrola">
                    <button onclick="zmienIloscKoszyka('${item.id}', -1)">-</button>
                    <span style="font-weight: bold; width: 20px; text-align: center;">${item.ilosc}</span>
                    <button onclick="zmienIloscKoszyka('${item.id}', 1)">+</button>
                    <button class="btn-usun" onclick="zmienIloscKoszyka('${item.id}', -9999)">Usuń</button>
                </div>
            </div>
        `;
    });

    licznik.innerText = sumaIlosc;
    sumaKwota.innerText = sumaCalkowita.toFixed(2);
}

// ---- LOGIKA ZAMÓWIENIA Z SUPABASE ----

async function zlozZamowienie() {
    if(koszyk.length === 0) return alert("Koszyk jest pusty!");

    const imie = document.getElementById('zam-imie').value.trim();
    const telefon = document.getElementById('zam-telefon').value.trim();
    const adres = document.getElementById('zam-adres').value.trim();
    const metoda = document.getElementById('zam-metoda').value;

    if (!imie || !telefon || !adres) {
        alert("Proszę wypełnić wszystkie pola: Imię/Firma, Telefon oraz Adres.");
        return;
    }

    // Zabezpieczenie przed klikaniem w kółko
    const przycisk = document.querySelector('#panel-zamowienia .btn-akcja');
    przycisk.innerText = "Wysyłanie...";
    przycisk.disabled = true;

    // Przygotowanie danych do bazy
    const klientDane = `${imie} | Tel: ${telefon} | Adres: ${adres}`;
    const produktyLista = koszyk.map(p => `${p.nazwa} (Ilość: ${p.ilosc}, Cena szt: ${p.cena} zł)`).join('\n');
    const wartoscCalkowita = koszyk.reduce((sum, item) => sum + (item.cena * item.ilosc), 0);
    
    // Generowanie unikalnego kodu, np. ZAM-X1A9
    const krotkiKod = Math.random().toString(36).substring(2, 6).toUpperCase();
    const kodZamowienia = `ZAM-${krotkiKod}`;

    const daneDoWyslania = {
        klient_dane: klientDane,
        produkty_lista: produktyLista,
        wartosc_calkowita: wartoscCalkowita,
        status: 'Nowe',
        kod_zamowienia: kodZamowienia,
        metoda_platnosci: metoda
    };

    // Zapis w Supabase (Tabela: zamowienia)
    const { error } = await supabaseClient
        .from('zamowienia')
        .insert([daneDoWyslania]);

    przycisk.innerText = "Złóż zamówienie (Bez płatności online)";
    przycisk.disabled = false;

    if (error) {
        console.error("Błąd Supabase:", error);
        alert(`Wystąpił problem z połączeniem z bazą: ${error.message}`);
    } else {
        alert(`Sukces! Zamówienie zostało złożone poprawnie.\nTwój kod zamówienia: ${kodZamowienia}\n\nSkontaktujemy się z Tobą wkrótce!`);
        
        // Czyszczenie koszyka i formularza
        koszyk = [];
        document.getElementById('zam-imie').value = '';
        document.getElementById('zam-telefon').value = '';
        document.getElementById('zam-adres').value = '';
        
        aktualizujWidokKoszyka();
        zmienSekcje('cennik');
    }
}

// Obsługuje przełączanie widoku między zakładkami
function zmienSekcje(nazwaSekcji) {
    document.querySelectorAll('.sekcja').forEach(s => s.classList.remove('aktywna'));
    document.querySelectorAll('nav > button, .dropdown-btn').forEach(b => b.classList.remove('aktywny'));
    
    const docelowaSekcja = document.getElementById('sekcja-' + nazwaSekcji);
    
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