// Definición de diapositivas. Coordenadas en el espacio de three.js: x derecha, y arriba, z hacia la cámara.
// Interior: sala de 10 x 9,2 (x de -5 a 5, z de -4,6 a 4,6). Exterior: camino a lo largo de z; entrada en z=58, edificio en z=-86.
// cam: az (grados, 0 = cámara frente a +z), d (distancia), h (altura de la cámara), look (punto observado).
// layout: 'text' (texto a la izquierda), 'textR' (texto a la derecha), 'chart' (gráfica grande), 'wide' (texto arriba, escena abajo).
// cast: m = tipo (kh2, car, bag, case, stack, bill), p = posición, ry = giro en grados, anim = clip inicial,
//       h = altura objetivo (personajes), sc = escala (objetos), d = denominación, det = caja de detección dibujada.

const ext = (k) => 50 - k * 8.2; // z base de las diapositivas del exterior (k = 0, 1, 2...)
const I = 'interior', E = 'exterior';

export const slides = [
  {
    id: 'problema', world: I, layout: 'text',
    title: 'Contar billetes a mano es lento y propenso a errores',
    body: `<p>Se quiere detectar las seis denominaciones de billetes colombianos en una imagen: $2.000, $5.000, $10.000, $20.000, $50.000 y $100.000.</p>
           <p>Una cámara que reconoce y suma billetes en tiempo real evita contarlos a mano.</p>`,
    cam: { from: { az: -14, d: 5.4, h: 1.5, look: [1.1, 1.0, -1.2] }, to: { az: 8, d: 4.6, h: 1.35, look: [1.1, 1.0, -1.2] } },
    cast: [
      { m: 'kh2', p: [1.0, 0, -0.6], ry: -12, anim: 'talk_a', h: 1.25, det: { c: 'personaje', p: 0.97 } },
      { m: 'bag', p: [3.2, 0, -2.4], ry: 20, h: 1.5, anim: 'spin', det: { c: 'bolsa', p: 0.93 } },
      { m: 'stack', p: [-0.3, 0.93, -2.9], d: '50k', w: 0.9, ry: 8, det: { c: '50_k', p: 0.94 } },
      { m: 'stack', p: [0.5, 0.93, -2.9], d: '20k', w: 0.9, ry: -6, det: { c: '20_k', p: 0.91 } },
    ],
  },
  {
    id: 'hipotesis', world: I, layout: 'textR',
    title: 'Hipótesis y usuarios',
    body: `<p><b>Hipótesis.</b> Un modelo YOLO nano, entrenado con fotos de billetes, reconoce cada denominación con alta precisión y corre con una webcam en un computador normal.</p>
           <p><b>Usuarios previstos.</b> Quienes manejan efectivo a diario, como cajas y comercios.</p>`,
    cam: { from: { az: 10, d: 5.2, h: 1.5, look: [-1.4, 1.0, -1.2] }, to: { az: -8, d: 4.6, h: 1.4, look: [-1.4, 1.0, -1.2] } },
    cast: [
      { m: 'kh2', p: [-1.2, 0, -0.5], ry: 15, anim: 'think', h: 1.25, det: { c: 'personaje', p: 0.96 } },
      { m: 'case', p: [-3.5, 0, -2.6], ry: 35, h: 2.2, anim: 'spin', det: { c: 'maletín', p: 0.92 } },
      { m: 'bill', p: [-2.4, 1.0, -0.6], d: '100k', w: 0.8, ry: 25, anim: 'float', det: { c: '100_k', p: 0.95 } },
    ],
  },
  {
    id: 'origen', world: I, layout: 'text',
    title: 'Conjunto de datos y etiquetas',
    body: `<p>Es una copia propia del conjunto <i>Colombian Bills Detection</i> de Roboflow (licencia CC BY 4.0), más unas 20 imágenes propias ya etiquetadas.</p>
           <ul><li>6 clases: 2_k, 5_k, 10_k, 20_k, 50_k y 100_k</li><li>2.934 imágenes y 3.028 cajas</li><li>Formato YOLO: un archivo de texto por imagen con la clase y la caja normalizada (x, y, ancho, alto)</li></ul>`,
    cam: { from: { az: -10, d: 5.6, h: 1.6, look: [1.0, 1.1, -1.5] }, to: { az: 12, d: 5.0, h: 1.5, look: [1.0, 1.1, -1.5] } },
    cast: [
      { m: 'kh2', p: [0.2, 0, -0.2], ry: -18, anim: 'point', h: 1.25, det: { c: 'personaje', p: 0.97 } },
      { m: 'bill', p: [1.6, 0.9, -2.4], d: '2k', w: 1.0, ry: 0, anim: 'stand', det: { c: '2_k', p: 0.93 } },
      { m: 'bill', p: [2.8, 0.9, -2.4], d: '5k', w: 1.0, ry: 0, anim: 'stand', det: { c: '5_k', p: 0.92 } },
      { m: 'bill', p: [4.0, 0.9, -2.4], d: '10k', w: 1.0, ry: -10, anim: 'stand', det: { c: '10_k', p: 0.94 } },
      { m: 'bill', p: [2.2, 2.1, -2.6], d: '20k', w: 1.0, ry: 0, anim: 'stand', det: { c: '20_k', p: 0.9 } },
      { m: 'bill', p: [3.4, 2.1, -2.6], d: '50k', w: 1.0, ry: 0, anim: 'stand', det: { c: '50_k', p: 0.95 } },
    ],
  },
  {
    id: 'cajas-clase', world: I, layout: 'chart',
    title: 'Cajas por clase en entrenamiento',
    body: `<p><b>Codificación.</b> Eje horizontal: clase. Eje vertical: cantidad de cajas en las imágenes de entrenamiento.</p>
           <p><b>Lectura.</b> 50_k es la más frecuente (463) y 20_k la más escasa (256). Es una proporción de 1,8 a 1, un desbalance leve.</p>`,
    figure: { type: 'img', src: 'img/clases-train.png', alt: 'Barras con el número de cajas por clase en entrenamiento' },
    cam: { from: { az: -8, d: 4.6, h: 1.3, look: [-2.6, 0.9, -0.8] }, to: { az: 8, d: 4.2, h: 1.25, look: [-2.6, 0.9, -0.8] } },
    cast: [
      { m: 'kh2', p: [-2.7, 0, 0.2], ry: 20, anim: 'talk_b', h: 1.2, det: { c: 'personaje', p: 0.96 } },
      { m: 'bag', p: [-4.0, 0, -1.8], ry: -25, h: 1.6, anim: 'spin', det: { c: 'bolsa', p: 0.9 } },
    ],
  },
  {
    id: 'ejemplos', world: I, layout: 'chart',
    title: 'Ejemplos con sus etiquetas',
    body: `<p><b>Codificación.</b> Cada caja verde encierra un billete y lleva el nombre de su clase.</p>
           <p><b>Lectura.</b> Los fondos varían (manos, telas, mesas) y los billetes aparecen arrugados, doblados o cortados por el borde. Esa variedad ayuda a generalizar, pero deja sesgos de captura que no se midieron.</p>`,
    figure: { type: 'img', src: 'img/labels-ejemplos.png', alt: 'Ocho imágenes de entrenamiento con sus cajas verdes y clases' },
    cam: { from: { az: 8, d: 4.4, h: 1.3, look: [-2.6, 0.9, -0.8] }, to: { az: -6, d: 4.0, h: 1.25, look: [-2.6, 0.9, -0.8] } },
    cast: [
      { m: 'kh2', p: [-2.5, 0, 0.1], ry: 15, anim: 'surprise', h: 1.2, det: { c: 'personaje', p: 0.95 } },
      { m: 'case', p: [-4.1, 0, -1.7], ry: 40, h: 1.5, anim: 'spin', det: { c: 'maletín', p: 0.9 } },
    ],
  },
  {
    id: 'division', world: I, layout: 'wide',
    title: 'División en entrenamiento, validación y prueba',
    body: `<p>El conjunto original dejaba casi todos los $5.000 en validación y muy pocos en entrenamiento. Se juntaron todas las imágenes y se repartieron 70 / 20 / 10, agrupando cada imagen por su clase más escasa (semilla 42).</p>`,
    table: {
      head: ['Conjunto', 'Imágenes', 'Cajas', '100_k', '10_k', '20_k', '2_k', '50_k', '5_k'],
      rows: [
        ['Entrenamiento', '2.051', '2.115', '286', '398', '256', '304', '463', '408'],
        ['Validación', '584', '603', '81', '114', '73', '88', '133', '114'],
        ['Prueba', '299', '310', '42', '57', '37', '46', '68', '60'],
      ],
    },
    cam: { from: { az: 0, d: 6.2, h: 1.9, look: [0, 0.9, -1.8] }, to: { az: 14, d: 5.4, h: 1.7, look: [0, 0.9, -1.8] } },
    cast: [
      { m: 'kh2', p: [-2.4, 0, -0.6], ry: 24, anim: 'talk_a', h: 1.25, det: { c: 'personaje', p: 0.97 } },
      { m: 'stack', p: [0.5, 0.93, -2.9], d: '100k', w: 0.9, ry: 6, det: { c: '100_k', p: 0.93 } },
      { m: 'stack', p: [1.4, 0.93, -2.9], d: '5k', w: 0.9, ry: -8, det: { c: '5_k', p: 0.92 } },
      { m: 'bag', p: [3.2, 0, -1.4], ry: -20, h: 1.4, anim: 'spin', det: { c: 'bolsa', p: 0.91 } },
    ],
  },
  {
    id: 'modelo', world: E, layout: 'text',
    title: 'Modelo: YOLO26 nano',
    body: `<p>260 capas, 2.506.140 parámetros y 5,9 GFLOPs. El archivo <code>best.pt</code> pesa 5,4 MB.</p>
           <p><b>Por qué YOLO.</b> Detecta en una sola pasada y la versión nano es liviana: corre con una webcam en un computador normal. En la GPU T4 tardó 4,9 ms de inferencia por imagen.</p>
           <p>El cuaderno no compara otras arquitecturas ni tamaños.</p>`,
    cam: { from: { az: -22, d: 9.5, h: 2.6, look: [0.6, 1.0, ext(0) - 2] }, to: { az: 6, d: 8.0, h: 2.0, look: [0.6, 1.0, ext(0) - 2] } },
    cast: [
      { m: 'car', p: [1.0, 0, ext(0) - 2.6], ry: 4, anim: 'drive', len: 4.4, enter: { from: [1.0, ext(0) + 22] }, det: { c: 'vehículo', p: 0.95 } },
      { m: 'bag', p: [-1.8, 0, ext(0) - 1.2], ry: 10, h: 1.5, anim: 'spin', det: { c: 'bolsa', p: 0.92 } },
    ],
  },
  {
    id: 'entrenamiento', world: E, layout: 'textR',
    title: 'Hiperparámetros y entrenamiento',
    body: `<ul><li>Pesos iniciales: <code>yolo26n.pt</code></li><li>150 épocas, imagen de 640 px, lote de 16, paciencia 50</li><li>Optimizador AdamW, tasa de aprendizaje 0,001</li><li>Aumentos: mosaic 1,0, rotación 10°, hsv_h 0,005, hsv_s 0,5, hsv_v 0,4, volteo horizontal 0, cierre del mosaic en las últimas 10 épocas</li><li>Google Colab con GPU Tesla T4, unos 90 minutos</li></ul>
           <p>El tono casi no se altera (hsv_h bajo) porque el color distingue las denominaciones. El volteo se apagó porque un billete espejado no existe.</p>`,
    cam: { from: { az: 18, d: 8.5, h: 2.2, look: [-1.5, 1.0, ext(1)] }, to: { az: -10, d: 7.2, h: 1.9, look: [-1.5, 1.0, ext(1)] } },
    cast: [
      { m: 'kh2', p: [-1.6, 0, ext(1)], ry: 22, anim: 'think', h: 1.6, det: { c: 'personaje', p: 0.96 } },
      { m: 'case', p: [-5.6, 0, ext(1) - 2], ry: 40, h: 1.5, anim: 'spin', det: { c: 'maletín', p: 0.91 } },
      { m: 'stack', p: [-3.4, 0, ext(1) + 0.4], d: '10k', w: 1.0, ry: 14, det: { c: '10_k', p: 0.94 }, ground: true },
    ],
  },
  {
    id: 'curvas', world: E, layout: 'chart',
    title: 'Curvas de entrenamiento y validación',
    body: `<p><b>Codificación.</b> Eje horizontal: época. Fila superior: pérdidas de entrenamiento (box, cls, l1). Fila inferior: pérdidas de validación y métricas (precisión, recall, mAP50, mAP50-95). Los puntos son datos y la línea suave es el promedio móvil.</p>
           <p><b>Lectura.</b> Las pérdidas bajan sin repuntes. El mAP50-95 pasa de 0,65 a 0,947.</p>`,
    figure: { type: 'img', src: 'img/results.png', alt: 'Diez paneles con las curvas de pérdidas y métricas por época' },
    cam: { from: { az: -8, d: 7.6, h: 1.9, look: [-3.0, 1.0, ext(2)] }, to: { az: 6, d: 7.0, h: 1.8, look: [-3.0, 1.0, ext(2)] } },
    cast: [
      { m: 'kh2', p: [-3.2, 0, ext(2) + 0.4], ry: 24, anim: 'talk_b', h: 1.5, det: { c: 'personaje', p: 0.95 } },
      { m: 'case', p: [-6.0, 0, ext(2) - 1.4], ry: 30, h: 1.5, anim: 'spin', det: { c: 'maletín', p: 0.93 } },
    ],
  },
  {
    id: 'map-epoca', world: E, layout: 'chart',
    title: 'mAP50-95 por época',
    body: `<p><b>Codificación.</b> Eje horizontal: época (1 a 142). Eje vertical: mAP50-95 en validación. El punto naranja marca la mejor época según Ultralytics (129, 0,947).</p>
           <p><b>Lectura.</b> Sube rápido en las primeras 25 épocas (0,65 a 0,849) y luego mejora despacio. La fluctuación entre épocas vecinas es de unas milésimas, así que el modelo ya estaba cerca de su techo.</p>`,
    figure: { type: 'chart', chart: 'map' },
    cam: { from: { az: 8, d: 7.4, h: 1.9, look: [-3.0, 1.0, ext(3)] }, to: { az: -8, d: 6.8, h: 1.7, look: [-3.0, 1.0, ext(3)] } },
    cast: [
      { m: 'kh2', p: [-3.0, 0, ext(3) + 0.2], ry: 22, anim: 'point', h: 1.5, det: { c: 'personaje', p: 0.96 } },
      { m: 'bag', p: [-5.6, 0, ext(3) - 2], ry: -15, h: 1.5, anim: 'spin', det: { c: 'bolsa', p: 0.9 } },
    ],
  },
  {
    id: 'metricas', world: E, layout: 'wide',
    title: 'Métricas finales',
    body: `<p>Validación en la mejor época (129) y prueba con <code>best.pt</code>. Todas las métricas están entre 0 y 1.</p>`,
    table: {
      head: ['Conjunto', 'Precisión', 'Recall', 'mAP50', 'mAP50-95'],
      rows: [['Validación (584 imágenes)', '0,996', '0,988', '0,991', '0,947'], ['Prueba (299 imágenes)', '0,997', '0,999', '0,995', '0,948']],
    },
    cam: { from: { az: -12, d: 8.6, h: 2.4, look: [0.5, 1.2, ext(4)] }, to: { az: 12, d: 7.8, h: 2.1, look: [0.5, 1.2, ext(4)] } },
    cast: [
      { m: 'kh2', p: [-1.2, 0, ext(4) + 0.6], ry: 14, anim: 'laugh', h: 1.6, det: { c: 'personaje', p: 0.97 } },
      { m: 'bag', p: [3.2, 0, ext(4) - 1.2], ry: -30, h: 1.5, anim: 'spin', det: { c: 'bolsa', p: 0.94 } },
      { m: 'case', p: [-5.6, 0, ext(4) - 3], ry: 35, h: 1.5, anim: 'spin', det: { c: 'maletín', p: 0.9 } },
    ],
  },
  {
    id: 'matriz', world: E, layout: 'chart',
    title: 'Matriz de confusión normalizada',
    body: `<p><b>Codificación.</b> Columnas: clase real. Filas: clase predicha. Cada columna suma 1; más oscuro es mayor proporción. La última columna es el fondo.</p>
           <p><b>Lectura.</b> La diagonal es 1,00 salvo en 100_k (0,98): un 0,01 se predijo como 50_k y otro 0,01 se perdió como fondo. Los falsos positivos sobre el fondo van sobre todo a 100_k (0,37) y 5_k (0,32).</p>`,
    figure: { type: 'img', src: 'img/confusion-normalizada.png', alt: 'Matriz de confusión normalizada de las seis clases y el fondo' },
    cam: { from: { az: -8, d: 7.4, h: 1.9, look: [-3.0, 1.0, ext(5)] }, to: { az: 7, d: 6.8, h: 1.8, look: [-3.0, 1.0, ext(5)] } },
    cast: [
      { m: 'kh2', p: [-3.1, 0, ext(5) + 0.4], ry: 22, anim: 'talk_a', h: 1.5, det: { c: 'personaje', p: 0.96 } },
      { m: 'bag', p: [-5.6, 0, ext(5) - 2], ry: 25, h: 1.5, anim: 'spin', det: { c: 'bolsa', p: 0.92 } },
    ],
  },
  {
    id: 'pr', world: E, layout: 'chart',
    title: 'Curva precisión y recall',
    body: `<p><b>Codificación.</b> Eje horizontal: recall. Eje vertical: precisión. Una línea por clase y la azul gruesa para todas, con su AP a IoU 0,5 en la leyenda.</p>
           <p><b>Lectura.</b> Todas las clases quedan pegadas a la esquina superior derecha. 100_k tiene el AP más bajo (0,971) y es la única con una caída visible cerca de recall 0,97. El mAP50 es 0,991.</p>`,
    figure: { type: 'img', src: 'img/pr-curve.png', alt: 'Curva de precisión y recall por clase' },
    cam: { from: { az: 7, d: 7.4, h: 1.9, look: [-3.0, 1.0, ext(6)] }, to: { az: -8, d: 6.8, h: 1.8, look: [-3.0, 1.0, ext(6)] } },
    cast: [
      { m: 'kh2', p: [-3.0, 0, ext(6) + 0.3], ry: 20, anim: 'think', h: 1.5, det: { c: 'personaje', p: 0.96 } },
      { m: 'case', p: [-6.2, 0, ext(6) - 1.6], ry: 60, h: 1.5, anim: 'spin', det: { c: 'maletín', p: 0.93 } },
    ],
  },
  {
    id: 'por-clase', world: E, layout: 'chart',
    title: 'mAP50-95 por clase en prueba',
    body: `<p><b>Codificación.</b> Una barra por clase; la altura es el mAP50-95 sobre las 299 imágenes de prueba. Redibujada con los valores impresos en el cuaderno.</p>
           <p><b>Lectura.</b> 10_k es la mejor (0,984) y 100_k la más baja (0,895). En mAP50 todas llegan a 0,995, así que la diferencia está en lo justa que es la caja con umbrales de IoU altos.</p>`,
    figure: { type: 'chart', chart: 'clases' },
    cam: { from: { az: -8, d: 7.4, h: 1.9, look: [-3.0, 1.0, ext(7)] }, to: { az: 8, d: 6.8, h: 1.8, look: [-3.0, 1.0, ext(7)] } },
    cast: [
      { m: 'kh2', p: [-3.0, 0, ext(7) + 0.3], ry: 22, anim: 'point', h: 1.5, det: { c: 'personaje', p: 0.96 } },
      { m: 'case', p: [-5.6, 0, ext(7) - 2], ry: -30, h: 1.5, anim: 'spin', det: { c: 'maletín', p: 0.9 } },
    ],
  },
  {
    id: 'predicciones', world: E, layout: 'chart',
    title: 'Predicciones sobre imágenes de prueba',
    body: `<p><b>Codificación.</b> Ocho imágenes del conjunto de prueba elegidas al azar. Cada caja lleva la clase y la confianza, con umbral 0,4.</p>
           <p><b>Lectura.</b> Estas son detecciones reales de <code>best.pt</code>. Las cajas siguen a los billetes con manos, fondos distintos y encuadres cortados.</p>`,
    figure: { type: 'img', src: 'img/predicciones-test.png', alt: 'Cuadrícula de ocho predicciones del modelo sobre imágenes de prueba' },
    cam: { from: { az: 8, d: 7.4, h: 1.9, look: [-3.0, 1.0, ext(8)] }, to: { az: -8, d: 6.8, h: 1.8, look: [-3.0, 1.0, ext(8)] } },
    cast: [
      { m: 'kh2', p: [-3.0, 0, ext(8) + 0.3], ry: 22, anim: 'surprise', h: 1.5, det: { c: 'personaje', p: 0.95 } },
      { m: 'bag', p: [-5.6, 0, ext(8) - 2], ry: 15, h: 1.5, anim: 'spin', det: { c: 'bolsa', p: 0.9 } },
    ],
  },
  {
    id: 'demo', world: E, layout: 'chart', demo: true,
    title: 'Demostración en el navegador',
    body: `<p>El modelo exportado a ONNX (9,4 MB) corre aquí con onnxruntime-web, sin enviar la imagen a ningún servidor. Sube una foto de billetes colombianos y verás las cajas con la clase y la confianza.</p>`,
    cam: { from: { az: -8, d: 7.4, h: 1.9, look: [-3.0, 1.0, ext(9)] }, to: { az: 8, d: 6.8, h: 1.8, look: [-3.0, 1.0, ext(9)] } },
    cast: [
      { m: 'kh2', p: [-3.0, 0, ext(9) + 0.3], ry: 22, anim: 'wave', h: 1.5, det: { c: 'personaje', p: 0.96 } },
      { m: 'bag', p: [-6.0, 0, ext(9) - 1.6], ry: 65, h: 1.5, anim: 'spin', det: { c: 'bolsa', p: 0.93 } },
    ],
  },
  {
    id: 'hallazgos', world: E, layout: 'text',
    title: 'Hallazgos',
    body: `<ul><li>mAP50-95 de 0,947 en validación y 0,948 en prueba, con las seis clases por encima de 0,89.</li><li>Repartir de nuevo el conjunto por clase corrigió el desbalance de los $5.000 que traía el original.</li><li>El modelo pesa 5,4 MB y deja la inferencia en milisegundos, así que cabe en un computador normal con webcam.</li></ul>`,
    cam: { from: { az: -18, d: 8.4, h: 2.3, look: [1.0, 1.1, ext(10)] }, to: { az: 8, d: 7.4, h: 2.0, look: [1.0, 1.1, ext(10)] } },
    cast: [
      { m: 'kh2', p: [1.2, 0, ext(10)], ry: -18, anim: 'laugh', h: 1.6, det: { c: 'personaje', p: 0.97 } },
      { m: 'bag', p: [4.4, 0, ext(10) - 2], ry: -20, h: 1.5, anim: 'spin', det: { c: 'bolsa', p: 0.93 } },
      { m: 'case', p: [-5.6, 0, ext(10) - 3], ry: 38, h: 1.5, anim: 'spin', det: { c: 'maletín', p: 0.9 } },
    ],
  },
  {
    id: 'limites', world: E, layout: 'textR',
    title: 'Limitaciones y trabajo futuro',
    body: `<ul><li><b>Clase débil:</b> 100_k tiene el mAP50-95 más bajo (0,895 en prueba) y concentra falsos positivos sobre el fondo.</li><li><b>Datos:</b> solo unas 20 imágenes son propias; el resto viene de otro conjunto, con sus condiciones de captura.</li><li><b>Sin comparar:</b> no se probó yolo26s ni otras arquitecturas.</li><li><b>En vivo:</b> el conteo del total en cámara no se midió con cifras.</li><li><b>Trabajo futuro:</b> más fotos propias de 100_k y 5_k, billetes dañados o parciales, y medir el conteo en vivo.</li></ul>`,
    cam: { from: { az: 16, d: 8.4, h: 2.2, look: [-1.4, 1.1, ext(11)] }, to: { az: -8, d: 7.4, h: 1.9, look: [-1.4, 1.1, ext(11)] } },
    cast: [
      { m: 'kh2', p: [-1.4, 0, ext(11)], ry: 20, anim: 'think', h: 1.6, det: { c: 'personaje', p: 0.96 } },
      { m: 'stack', p: [-3.6, 0, ext(11) + 0.4], d: '100k', w: 1.1, ry: 18, det: { c: '100_k', p: 0.9 }, ground: true },
      { m: 'bag', p: [-5.6, 0, ext(11) - 2.5], ry: 10, h: 1.5, anim: 'spin', det: { c: 'bolsa', p: 0.9 } },
    ],
  },
  {
    id: 'gracias', world: E, layout: 'wide', final: true,
    title: 'Muchas gracias',
    body: '',
    cam: { from: { az: -28, d: 9.5, h: 2.4, look: [0.0, 1.0, ext(12) - 3] }, to: { az: 10, d: 8.2, h: 2.0, look: [0.0, 1.0, ext(12) - 7] } },
    cast: [
      { m: 'car', p: [0.4, 0, ext(12) - 8], ry: 0, anim: 'drive', len: 4.6, enter: { from: [0.4, ext(12) + 14] }, det: { c: 'vehículo', p: 0.96 }, carry: { m: 'bag', h: 1.0 } },
      { m: 'bag', p: [-7.0, 0, ext(12) - 6], ry: 20, h: 2.2, anim: 'spin', det: { c: 'bolsa', p: 0.93 } },
    ],
  },
];

export const CLASS_COLOR = {
  '2_k': '#4f8fdc', '5_k': '#f08a2c', '10_k': '#3f7ae0', '20_k': '#3ec46d', '50_k': '#8b5cf6', '100_k': '#e8b923',
  personaje: '#ff7a2f', bolsa: '#2fc6c0', 'maletín': '#e0529c', 'vehículo': '#ffb020',
};
