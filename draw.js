const cordLenghtMM = 600; 
const stringL = 1/cordLenghtMM;//1.667;
//((föremål / avstånd) / snörfraktion) * skala
//const m2mm = 1000;

const calcToPaperLength = function (thingLenghtMeter, distanceMeter) {
    var tr = ((thingLenghtMeter / distanceMeter) / stringL); //* m2mm
    return tr;
} 

const createRefElement = function(clazz, height, width, distance) {
    const newDiv = document.createElement("div");
   // const discr = document.createTextNode(distance);
   // newDiv.appendChild(discr);
    newDiv.classList.add("frame");
    newDiv.classList.add(clazz);
    newDiv.style.width = calcToPaperLength(width, distance) + "mm";
    newDiv.style.height= calcToPaperLength(height, distance) + "mm";
    return newDiv;
}

const createGroup = function(clazz, height, width, distances, parent){
    for(const distance of distances){
        const elem = createRefElement(clazz, height, width, distance);
        parent.appendChild(elem)
        //console.log(distance, height,width ,parent, once)
    }
}



window.onload = function ()
{
    const distances = [100, 200, 300, 400, 500, 600]
    createGroup("doorC", 2, 1, distances, document.getElementById("doorFrame"));
    createGroup("soldierC", 1.8, 0.5, distances, document.getElementById("soldier"));
    createGroup("imfC", 2.9, 2.44, distances, document.getElementById("imf"));
    createGroup("v70C", 1.44, 4.72, distances, document.getElementById("v70"));
    
} 

