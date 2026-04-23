let timerEl = document.getElementById("timer");
let tabela = document.getElementById("tabela");
let ao5El = document.getElementById("ao5");
let ao12El = document.getElementById("ao12");

let tempo = 0;
let rodando = false;
let inicio;
let interval;

let tempos = [];

/* SCRAMBLE */
function novoScramble(){
  let moves = ["R","L","U","D","F","B"];
  let mods = ["","'","2"];
  let s = [];

  for(let i=0;i<20;i++){
    let m = moves[Math.floor(Math.random()*6)];
    let mod = mods[Math.floor(Math.random()*3)];
    s.push(m+mod);
  }

  document.getElementById("scramble").innerText = s.join(" ");
}

novoScramble();

/* TIMER */
document.addEventListener("keydown", e=>{
  if(e.code==="Space"){
    if(!rodando){
      inicio = Date.now();
      interval = setInterval(()=>{
        tempo = Date.now()-inicio;
        timerEl.innerText = (tempo/1000).toFixed(2);
      },10);
      rodando=true;
    }else{
      clearInterval(interval);
      rodando=false;

      tempos.unshift(tempo/1000);
      atualizarTabela();
      atualizarMedias();
      desenharGrafico();
    }
  }
});

/* TABELA */
function atualizarTabela(){
  tabela.innerHTML="";
  tempos.forEach((t,i)=>{
    tabela.innerHTML += `
      <tr>
        <td>${i+1}</td>
        <td>${t.toFixed(2)}</td>
        <td>-</td>
        <td>-</td>
      </tr>`;
  });
}

/* MÉDIAS */
function media(n){
  if(tempos.length<n) return "--";
  let arr = tempos.slice(0,n);
  return (arr.reduce((a,b)=>a+b)/n).toFixed(2);
}

function atualizarMedias(){
  ao5El.innerText = "ao5: "+media(5);
  ao12El.innerText = "ao12: "+media(12);
}

/* GRÁFICO */
let canvas = document.getElementById("grafico");
let ctx = canvas.getContext("2d");

function desenharGrafico(){
  canvas.width = canvas.clientWidth;
  canvas.height = 200;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(tempos.length<2) return;

  let max = Math.max(...tempos);
  let step = canvas.width/(tempos.length-1);

  ctx.strokeStyle="#8b5cf6";
  ctx.beginPath();

  tempos.forEach((t,i)=>{
    let x = i*step;
    let y = canvas.height - (t/max)*canvas.height;

    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });

  ctx.stroke();
}