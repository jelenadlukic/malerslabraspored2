# Mejkers Lab raspored

Responsive aplikacija za rezervaciju termina u Mejkers Lab učionici. Javni raspored se nalazi na početnoj strani, a administracija rezervacija na ruti `/adminpanel`.

## Netlify podešavanje

Projekat se objavljuje direktno iz ovog Git repozitorijuma. Netlify koristi podešavanja iz `netlify.toml`:

- build komanda: `npm run build`
- publish direktorijum: `dist`
- serverless funkcije: `netlify/functions`

U Netlify projektu, u odeljku **Environment variables**, dodaj:

```text
ADMIN_PASSWORD=<lozinka-koju-unosiš-samo-u-Netlify-u>
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
```
