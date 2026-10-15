import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Produto } from "@/components/sections/Produto";
import { Alunos } from "@/components/sections/Alunos";
import { Financeiro } from "@/components/sections/Financeiro";
import { Equipe } from "@/components/sections/Equipe";
import { Dores } from "@/components/sections/Dores";
import { AppAluno } from "@/components/sections/AppAluno";
import { Treinos } from "@/components/sections/Treinos";
import { Matriculas } from "@/components/sections/Matriculas";
import { Dono } from "@/components/sections/Dono";
import { Comecar } from "@/components/sections/Comecar";
import { SplashScreen } from "@/components/ui/SplashScreen";

export default function Home() {
  return (
    <>
      <SplashScreen storageKey="musclepro:splash:landing" />
      <Header />
      <main>
        <Hero />
        <Produto />
        <AppAluno />
        <Treinos />
        <Alunos />
        <Matriculas />
        <Financeiro />
        <Dono />
        <Equipe />
        <Dores />
        <Comecar />
      </main>
      <Footer />
    </>
  );
}
