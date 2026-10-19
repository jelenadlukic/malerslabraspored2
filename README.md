# Mejkers Lab raspored

Responsive aplikacija za rezervaciju termina u Mejkers Lab učionici. Raspored, inventar opreme i trajna evidencija prisustva dostupni su nastavniku posle prijave, a administracija rezervacija na ruti `/adminpanel`.

## Pristup nastavnika

Početna strana zahteva prijavu nastavnika pre učitavanja sadržaja. Prijava važi osam sati. Raspored i oprema su odvojeni prikazi u glavnoj navigaciji. Raspored dozvoljava rezervacije od današnjeg dana do 14 dana unapred, a vikendom se odmah otvara naredna radna nedelja. Termini Sekcije mikrokontrolera utorkom i četvrtkom od 12.00 do 14.00 trajno su blokirani za druge rezervacije.

Inventar je podeljen na mašine i alate, pribor i setove, digitalnu opremu i nameštaj. Svaka evidentirana stavka ima sliku i količinu, a kompletan inventar može da se preuzme kao PDF dokument.

Stranica „Prisustvo“ čuva trajnu arhivu svih rezervacija, uključujući termine koji su prošli ili su kasnije uklonjeni iz aktivnog rasporeda.

## Netlify podešavanje

Projekat se objavljuje direktno iz ovog Git repozitorijuma. Netlify koristi podešavanja iz `netlify.toml`:

- build komanda: `npm run build`
- publish direktorijum: `dist`
- serverless funkcije: `netlify/functions`

Za nastavničku prijavu nije potrebno praviti ništa dodatno u Netlify-u. Aplikacija direktno koristi objavljenu funkciju `/.netlify/functions/teacher-auth`.

Za administratorski panel u Netlify projektu, u odeljku **Environment variables**, dodaj:

```text
MEJKERS_PRISTUP=<lozinka-koju-unosiš-samo-u-Netlify-u>
```

Posle dodavanja promenljive pokreni novi deploy. Lozinka se namerno ne čuva u GitHub kodu.

## Admin panel

Adresa: `https://mejkerslabraspored.netlify.app/adminpanel`

Dozvoljena korisnička imena:

- `direktor`
- `koordinator`

Oba korisnika koriste lozinku iz promenljive `ADMIN_PASSWORD`. Prijava važi osam sati. Administrator može da pregleda sve rezervacije, pretražuje ih, menja podatke i termine, kao i da izbriše rezervaciju uz potvrdu.

## Lokalna provera

```bash
npm install
npm run build
npx netlify-cli dev
```
