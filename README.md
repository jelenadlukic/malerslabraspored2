# Mejkers Lab raspored

Responsive aplikacija za rezervaciju termina u Mejkers Lab učionici. Raspored, inventar opreme i trajna evidencija prisustva dostupni su nastavniku posle prijave, a administracija rezervacija na ruti `/adminpanel`.

## Pristup nastavnika

Početna strana zahteva prijavu pre učitavanja sadržaja. Obična prijava važi osam sati i završava se zatvaranjem pregledača, dok opcija „Zapamti me“ čuva bezbednu prijavu 30 dana bez čuvanja lozinke u pregledaču. Raspored, oprema i prisustvo su odvojeni prikazi u glavnoj navigaciji. Raspored dozvoljava rezervacije od današnjeg dana do 14 dana unapred, a vikendom se odmah otvara naredna radna nedelja. Termini Sekcije mikrokontrolera utorkom i četvrtkom od 12.00 do 14.00 početno su trajno blokirani za druge rezervacije.

Inventar je podeljen na mašine i alate, pribor i setove, digitalnu opremu i nameštaj. Svaka evidentirana stavka ima sliku i količinu, a kompletan inventar može da se preuzme kao PDF dokument.

Stranica „Prisustvo“ čuva trajnu arhivu svih rezervacija, uključujući termine koji su prošli ili su kasnije uklonjeni iz aktivnog rasporeda.

## Netlify podešavanje

Projekat se objavljuje direktno iz ovog Git repozitorijuma. Netlify koristi podešavanja iz `netlify.toml`:

- build komanda: `npm run build`
- publish direktorijum: `dist`
- serverless funkcije: `netlify/functions`

Za prijavu nije potrebno praviti ništa dodatno u Netlify-u. Aplikacija direktno koristi objavljene serverless funkcije, a lozinke se u kodu proveravaju preko kontrolnih hash vrednosti.

## Admin panel

Adresa: `https://mejkerslabraspored.netlify.app/adminpanel`

Dozvoljena korisnička imena:

- `direktor`
- `koordinator`

Direktor i koordinator prijavljuju se na istoj početnoj strani kao nastavnik, a zatim dobijaju dodatno dugme „Admin“. Administrator može da pregleda, pretražuje, dodaje, menja i briše rezervacije, kao i da dodaje i uklanja trajne nedeljne termine.

## Lokalna provera

```bash
npm install
npm run build
npx netlify-cli dev
```
