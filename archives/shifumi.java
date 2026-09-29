/**
la classe principale pour le jeu shifumi
// ce programme simule un jeu contre l'ordinateur avec des règles classiques
regle du jeu:
la feuille bats la pierre
le ciseau bats la feuille
la pierre bats le ciseau
si deux tirent similaire alors c'est une égalité
@author Ruben Battocchio
@version 1.0
*/
import java.util.Scanner; // importation de la classe Scanner pour lire les entrées utilisateur
import java.lang.Math;    // importation de la classe Math pour générer des nombres aléatoires

public class shifumi {
    public static void main(String[] args) {
        // déclaration des variables
        int nbpoints = 0;      // nombre de points nécessaires pour gagner la partie
        char choixJoueur;      // choix de l'utilisateur (p, f ou c)
        char choixOrdi;        // choix de l'ordinateur (p, f ou c)
        int aleatoire;         // variable pour stocker le nombre aléatoire généré
        int nbsec = 0;         // variable pour la pause en secondes, initialisée à 1
        int scoreJoueur = 0;   // score de l'utilisateur
        int scoreOrdi = 0;     // score de l'ordinateur

        // ouverture du scanner pour lire les entrées utilisateur
        try (Scanner scanner = new Scanner(System.in)) {
            String rejouer = "o";
            while (rejouer.equals("o")) {
                // réinitialisation des scores et du nombre de points
                nbpoints = 0;
                scoreJoueur = 0;
                scoreOrdi = 0;

                // étape 1: demander à l'utilisateur le nombre de points de la partie
                while(nbpoints!=3 && nbpoints!= 5 && nbpoints!=10) { // boucle jusqu'à ce que l'utilisateur saisisse 3, 5 ou 10
                    System.out.println("En combien de points doit se dérouler la partie ? (3, 5 ou 10)");
                    nbpoints = scanner.nextInt(); // lecture de la saisie utilisateur
                    if(nbpoints != 3 && nbpoints != 5 && nbpoints != 10) {
                        System.out.println("Choisissez entre 3, 5 ou 10 pour le nombre de points de la partie");
                    } else {
                        System.out.println("La partie se jouera en " + nbpoints + " points");
                    }
                }
                // boucle principale du jeu
                while(scoreJoueur < nbpoints && scoreOrdi < nbpoints) {
                    System.out.println("Choisissez un outil (p, f ou c)");
                    choixJoueur = scanner.next().charAt(0); // lecture du choix utilisateur
                    while(choixJoueur != 'p' && choixJoueur != 'f' && choixJoueur != 'c') {
                        System.out.println("Choisissez entre p, f ou c");
                        choixJoueur = scanner.next().charAt(0);
                    }
                    System.out.println("Vous avez choisi: " + choixJoueur);

                    // choix aléatoire de l'ordinateur
                    aleatoire = (int)(Math.random()*3)+1;
                    if (aleatoire == 1) {
                        choixOrdi = 'f';
                    }
                    else if(aleatoire == 2) {
                        choixOrdi = 'p';
                    }
                    else {
                        choixOrdi = 'c';
                    }

                    try {
                        Thread.sleep(nbsec*3000);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    System.out.println("L'ordinateur a choisi: " + choixOrdi);

                    // déterminer le gagnant
                    if(choixJoueur == choixOrdi) {
                        System.out.println("Égalité, aucun point marqué");
                    }
                    else if((choixJoueur == 'f' && choixOrdi == 'p')) {
                        scoreJoueur += 1;
                        System.out.println("Vous marquez un point");
                    }
                    else if((choixJoueur == 'p' && choixOrdi == 'c')) {
                        scoreJoueur += 1;
                        System.out.println("Vous marquez un point");
                    }
                    else if((choixJoueur == 'c' && choixOrdi == 'f')) {
                        scoreJoueur += 1;
                        System.out.println("Vous marquez un point");
                    }
                    else {
                        scoreOrdi += 1;
                        System.out.println("L'ordinateur marque un point");
                    }
                    System.out.println("Score actuel - Joueur: " + scoreJoueur + " | Ordinateur: " + scoreOrdi);
                }
                System.out.println("Score final - Joueur: " + scoreJoueur + " | Ordinateur: " + scoreOrdi);

                // phrase pour demander si on veut rejouer
                System.out.println("Voulez-vous rejouer ? (o/n)");
                rejouer = scanner.next().toLowerCase();
                while (!rejouer.equals("o") && !rejouer.equals("n")) {
                    System.out.println("Répondez par 'o' pour oui ou 'n' pour non.");
                    rejouer = scanner.next().toLowerCase();
                }
            }
            System.out.println("Merci d'avoir joué !");
        }
    }
}