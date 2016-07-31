var utility = require('./utility.js');

exports.prepareSimulation = function(ctx,res)
{
  CreateBlobbyLandmass(ctx);
  SetSunlight(ctx);
  EstimateRainfall(ctx);
  CreateOcean(ctx, ctx.area * 2);
  SprayPlants(ctx);
  res(null,ctx);
};
function killPlant(p,z,ctx)
{
  ctx.hasPlant[p] = false;
  ctx.nutroStore[p] = null;
  ctx.nuciumStore[p] = null;
  
  if(ctx.dna[p]!=null)
  {
    ctx.nutro[z] += ctx.GetNutroEndowment(p) * ctx.GetNumberSeeds(p) * 2;
    ctx.nucium[z] += ctx.GetNuciumEndowment(p) * ctx.GetNumberSeeds(p) * 2;
  }
  ctx.dna[p] = null;
};
function seed(p,z,ctx)
{

};
exports.simulateDay = function(ctx,res)
{
  if(ctx.days % 10)
  {
    SprayPlants(ctx);
  }
  //  Regrowing nutrients
  // for(var z = 0 ; z < ctx.area ; z++)
  // {
  //    ctx.nutro[z] = 5000;
  //    ctx.nucium[z] = 5000;
  //   // if(ctx.nutro[z]<5)
  //   //   ctx.nutro[z] += 15;
  //   // if(ctx.nucium[z]<5)
  //   //   ctx.nucium[z] += 15;
  // }

  //  Seeds
  var seeds = new Array(ctx.plantArea);
  for (var i = 0; i < ctx.plantArea; ++i) { seeds[i] = null; }

  //  Randomizing plant order for fairness
  var plantOrder = new Array(ctx.plantArea);
  for (var i = 0; i < ctx.plantArea; ++i) { plantOrder[i] = i; }
  plantOrder = utility.shuffle(plantOrder);

  //  Simulations
  for(var q = 0 ; q < ctx.plantArea ; q++)
  {
    var p = plantOrder[q];
    var z = ctx.ConvertPToZ(p);

    if(!ctx.hasPlant[p] || !ctx.dna[p] || ctx.depth[z] > 0)
    {
      killPlant(p,z,ctx);
      continue;
    }

    var nutroConsumption = ctx.GetNutroConsumption(p);
    var nutroMetabolism = ctx.GetNutroMetabolism(p);
    var nutroEndowment = ctx.GetNutroEndowment(p);

    var nuciumConsumption = ctx.GetNuciumConsumption(p);
    var nuciumMetabolism = ctx.GetNuciumMetabolism(p);
    var nuciumEndowment = ctx.GetNuciumEndowment(p);
    var numberSeeds = ctx.GetNumberSeeds(p);

    //  Stagnation
    if (nutroConsumption == nutroMetabolism || 
        nuciumConsumption == nuciumMetabolism)
    {
      killPlant(p,z,ctx);
      continue;
    }

    //  Nutro Consumption
    if(ctx.nutro[z] > 0)
    {
      if(ctx.nutro[z] - nutroConsumption >= 0)
      {
        ctx.nutroStore[p] += nutroConsumption;
        ctx.nutro[z] -= nutroConsumption;
      }
      else 
      {
        ctx.nutroStore[p] += ctx.nutro[z];
        ctx.nutro[z] = 0;
      }
    }
    ctx.nutroStore[p] -= nutroMetabolism;
    
    //  Nucium Consumption
    if(ctx.nucium[z] > 0)
    {
      if(ctx.nucium[z] - nuciumConsumption >= 0)
      {
        ctx.nuciumStore[p] += nuciumConsumption;
        ctx.nucium[z] -= nuciumConsumption;
      }
      else 
      {
        ctx.nuciumStore[p] += ctx.nucium[z];
        ctx.nucium[z] = 0;
      }
    }
    ctx.nutroStore[p] -= nutroMetabolism;

    //  Water
    if(ctx.rules.water)
    {
      ctx.waterStore[p] += ctx.rainfall[z];
      ctx.waterStore[p] -= waterMetabolism;
    }

    //  Root competition
    if(ctx.rules.roots && Number(ctx.rules.roots > 0) && Number(ctx.rules.roots < 9)) {
      var numberNeighbors = 0;
      var neighbors = ctx.GetPlantNeighbors(p,true);
      for(var n = 0 ; n < neighbors.length ; n++)
      {
        if(ctx.hasPlant[neighbors[n]])
          numberNeighbors++;
      }
      if(numberNeighbors >= Number(ctx.rules.roots))
      {
        killPlant(p,z,ctx)
        continue;
      }
    }

    //  Starvation
    if(ctx.nutroStore[p] < 0 || ctx.nuciumStore[p] < 0)
    {
      killPlant(p,z,ctx);
      continue;
    }

    //  Seed sowing
    if (ctx.nutroStore[p]  > nutroEndowment  * numberSeeds && 
        ctx.nuciumStore[p] > nuciumEndowment * numberSeeds) 
    {

      var neighbors = ctx.GetRingOfPlantCoordinates(p, ctx.GetSeedRadius(p), false);
      for(var s = 0 ; s < numberSeeds ; s++)
      {
        var neighbor = neighbors[utility.randomNumberBetween(0,neighbors.length)];
        
        if(!ctx.hasPlant[neighbor] && //  If it doens't already have a plant
            ctx.depth[ctx.ConvertPToZ(neighbor)] == 0) // And isn't water
        {
          if(seeds[neighbor]) //  If it already have a seed
          {  
            if (nutroEndowment < seeds[neighbor].nutroStore ||
                nuciumEndowment < seeds[neighbor].nuciumStore)
            {
              //  The seed here has more of an endowment than us
              continue; //  Don't sow
            }
          }
          
          //  Sow the seed
          seeds[neighbor] = {
            dna: MutateDNA(ctx.dna[p], ctx.rules.mutation)
            , nutroStore: nutroEndowment
            , nuciumStore: nuciumEndowment
          }

          //  In this case you only lose nutrients if the seed happens
          ctx.nutroStore[p] -= nutroEndowment;// * numberSeeds;
          ctx.nuciumStore[p] -= nuciumEndowment;// * numberSeeds;
        }
      }
    }
  }

  //  Seeds taking root
  for(var s = 0 ; s < ctx.plantArea ; s++)
  {
    if(seeds[s] != null)
    {
      ctx.dna[s] = seeds[s].dna;
      ctx.nutroStore[s] = seeds[s].nutroStore;
      ctx.nuciumStore[s] = seeds[s].nuciumStore;
      ctx.hasPlant[s] = true;
    }
  }

  res(null);
};
exports.onMonth = function(ctx,res)
{
  //console.log("A month! " + ctx.month);
  res(null);
};
exports.onYear = function(ctx,res)
{
  //console.log("A year! " + ctx.year);
  res(null);
};

function MutateDNA(dna,mutationRate)
{
  var newDna = "";
  var hasChanged = false;
  for(var d = 0 ; d < dna.length ; d++)
  {
    var valueAtDna = dna.charCodeAt(d)-97;
    if(Math.random() > mutationRate)
    {
      hasChanged = true;
      //  Mutate
      if(Math.random() > 0.5)
      {  
        valueAtDna ++;
      }
      else
      {
        valueAtDna--;
        if(valueAtDna <1) valueAtDna++;
      }
    }
    newDna += String.fromCharCode(97 + valueAtDna);
  }
  return newDna;
}

function CoordSubtract(a,b)
{
  return {
    f: a.f - b.f,
    s: a.s - b.s
  }
}

function GetMagnitude(coord)
{
  return Math.sqrt(Math.pow(coord.f,2) + Math.pow(coord.s,2));
}

function ShouldPaint(ctx, coord, goo, threshold, balls)
{
  var sum = 0;
  for(var b = 0 ; b < balls.length; b++) {

    //  Can we get to ball by wrapping aroudn the torus?
    var distanceX = Math.abs(balls[b].coord.f - coord.f);
    if(distanceX > ctx.columns/2) 
    {
      distanceX = ctx.columns - distanceX;
    }
    var distanceY = Math.abs(balls[b].coord.s - coord.s);
    if(distanceY > ctx.rows/2) 
    {
      distanceY = ctx.rows - distanceY;
    }

    sum += balls[b].radius / Math.max(0.0001, Math.pow(GetMagnitude({f:distanceX,s:distanceY}),goo));
  }
  //console.log(sum);
  return sum > threshold;
}

function CreateBlob(ctx,startingCoord,radius,numberNodes)
{
  var balls = new Array();

  //  Creating the balls
  for(var n = 0 ; n < numberNodes ; n++) {
    balls.push(
      {
        coord : {
          f: startingCoord.f + utility.randomNumberBetween(-radius*2,radius*2)
          ,s: startingCoord.s + utility.randomNumberBetween(-radius*2,radius*2)
        }
        ,radius : radius / numberNodes
      });
    
    //  Use this line to denote the ball position
    //ctx.height[ctx.ConvertToZ(balls[n].coord)] += 10;
  }

  //  Tralling throuhg all provinces seeing if they are the blob.
  var blob = new Array();
  for(var z = 0 ; z < ctx.area ; z ++)
  {
    if(ShouldPaint(ctx, ctx.ConvertToCoord(z),1,0.8,balls))
    {
      blob.push(z);
    }
  }
  return blob;
}
function CreateBlobbyLandmass(ctx)
{
  var continentMap = new Array(ctx.area);
  for(var z = 0 ; z < ctx.area; z++) { 
    continentMap[z]=0;
  }

  for(var b = 0 ; b < 3 ; b++) {
    var startingCoord = {
      f: (ctx.columns/2) + utility.randomNumberBetween(-ctx.columns/10,-ctx.columns/10)
      ,s: (ctx.rows/2) + utility.randomNumberBetween(-ctx.rows/10,-ctx.rows/10)
    }

    var continent = CreateBlob(ctx, startingCoord, ctx.columns/10, 6);
    for (var p = 0; p < continent.length; p++)
    {
       if(!ctx.continent[continent[p]])
       {
        ctx.height[continent[p]] += utility.randomNumberBetween(2,5);
        ctx.continent[continent[p]] = true;
      }
    }
  }
}
function CreateLandmass(ctx)
{
  for(var z = 0 ; z < ctx.area; z++) { 
    continentMap[z]=0;
  }
  
  for (var c = 0; c < 3; c++)
  {
    //  Create continent height
    var centerContinentX = -1;
    var centerContinentY = -1;

    while (centerContinentX == -1 || centerContinentY == -1)
    {
      var attemptedX = (ctx.columns / 2) + utility.randomNumberBetween(-ctx.columns / 4, ctx.columns / 4);
      var attemptedY = (ctx.rows / 2) + utility.randomNumberBetween(-ctx.rows / 4, ctx.rows / 4);
           
      if (continentMap[ctx.ConvertToZ({f:attemptedX, s: attemptedY})] == 0)
      {
        centerContinentX = attemptedX;
        centerContinentY = attemptedY;
      }
    }

    //How far we venture from the continent to place a blob
    var radius = ((ctx.columns + ctx.rows) / 2) / 6;

    for (var i = 0; i < 5; i++)
    {
      var blobCenter = {
        f:centerContinentX + utility.randomNumberBetween(-radius,radius),
        s:centerContinentY + utility.randomNumberBetween(-radius,radius)};
      
      ctx.WrapCoordinate(blobCenter);
      
      var blob_radius = utility.randomNumberBetween(2,8);
      
      var blobResults = ctx.GetRingOfCoordinates(ctx.ConvertToZ(blobCenter), blob_radius, true);

      for (var p = 0; p < blobResults.length; p++)
      {
         if(!ctx.continent[blobResults[p]])
         {
          ctx.height[blobResults[p]] += utility.randomNumberBetween(2,5);
          ctx.continent[blobResults[p]] = true;
        }
      }
    }

  }

}
function CreateOcean(ctx,totalWaterRequired)
{
  var numberPillars = ctx.area;
  
  var startFlat = true;
  if(startFlat)
  {   
    for (var p = 0; p < ctx.area; p++)
    {
      if(!ctx.continent[p]) {
        CreatePillarOfWaterAtZ(ctx, 
          p, 
          totalWaterRequired / numberPillars);
      }
      else {
        var pillarZ = -1;
        while(pillarZ == -1)
        {
          var attempt = utility.randomNumberBetween(0, ctx.area);
          if(!ctx.continent[attempt])
          {
            pillarZ = attempt;
          }
        }
        
        CreatePillarOfWaterAtZ(ctx, 
          pillarZ, 
          totalWaterRequired / numberPillars);
        }
    }
  }
  else
  {
    for (var p = 0; p < numberPillars; p++)
    {
      var pillarZ = -1;
      while(pillarZ == -1)
      {
        var attempt = utility.randomNumberBetween(0, ctx.area);
        if(!ctx.continent[attempt])
        {
          pillarZ = attempt;
        }
      }
      
      CreatePillarOfWaterAtZ(ctx, 
        pillarZ, 
        totalWaterRequired / numberPillars);
    }
  }
  ResolveWater(ctx);

}
function CreatePillarOfWaterAtZ(ctx, z, unitsOfWater)
{
  ctx.depth[z] += unitsOfWater;
  ctx.unresolvedWater[z] = true;
}

function ResolveWater(ctx)
{
  var accuracy = 0.05;//0.005;
  var next = 0;
  while((next = GiveWater(next,accuracy,ctx)) < ctx.area)
  {
    if(next == -1)
    {
      next = 0;
      
      do 
      {
        next++;
        if(next >= ctx.area)
        {
          return;
        }
      }while(!ctx.unresolvedWater[next]);
    }
  }
}

function GiveWater(z, accuracy, ctx){
  var lastIndex = -1;

  var depth = ctx.depth[z];

  if (depth == 0)
  {
    ctx.unresolvedWater[z] = false;
    return lastIndex;
  }

  var height = ctx.height[z];
  var elevation = depth + height;

  var neighbors = ctx.GetNeighbors(z, false);

  var numberPossibleDonees = 0;
  //  Continually give out water till you can't
  do
  {
    depth = ctx.depth[z];
    elevation = depth + height;

    var steepestSlope = 0;
    var steepestSlopeValue = 0;
    numberPossibleDonees = 0;

    //  Find the steepest slope
    for (var n = 0; n < neighbors.length; n++)
    {
      var n_index = neighbors[n];

      var neighborDepth = ctx.depth[n_index];
      var neighborHeight = ctx.height[n_index];
      var neighborElevation = neighborDepth + neighborHeight;

      var slope = elevation - neighborElevation;

      //  Do we have a downward slow too great?
      if (slope > accuracy)
      {
        numberPossibleDonees++;

        if (slope > steepestSlopeValue)
        {
          steepestSlope = n;
          steepestSlopeValue = slope;
        }
      }

      //  Do we have an upward slope that is too great?
      if (slope < -accuracy)
      {
        //  If that plot has water then it needs to queue up for it
        if (neighborDepth > 0)
        {
          ctx.unresolvedWater[n_index] = true;
          lastIndex = n_index;
        }
      }
    }

    if (numberPossibleDonees >= 1)
    {
      //  There was at least one downward slope that was too great

      var n_index = neighbors[steepestSlope];
      ctx.unresolvedWater[n_index] = true;

      //  Can we pass half our height difference
      if (ctx.depth[z] > (steepestSlopeValue / 2))
      {
        //  Yes we can
        ctx.depth[z] -= (steepestSlopeValue / 2);
        ctx.depth[n_index] += (steepestSlopeValue / 2);
      }
      else
      {
        //  No we cant give enoguht to level them so we give all instead
        ctx.depth[z] = 0;
        ctx.depth[n_index] += ctx.depth[z];
      }
    }
    else
    {
      //  There was nothing to put out so 
      ctx.unresolvedWater[z] = false;
    }
  }
  //If we had more than one possibility than we can try again
  while (numberPossibleDonees > 1 && ctx.depth[z] > 0);

  return lastIndex;
}

function SprayPlants(ctx)
{
  var plantOrder = new Array(ctx.plantArea);
  for (var i = 0; i < ctx.plantArea; ++i) { plantOrder[i] = i; }
  plantOrder = utility.shuffle(plantOrder);

  //  Simulations
  for(var q = 0 ; q < ctx.plantArea ; q++)
  {
    var p = plantOrder[q];
    var z = ctx.ConvertPToZ(p);

    if(Math.random()>0.95)
    {
      ctx.dna[p] = 
          String.fromCharCode(utility.randomNumberBetween(1,5)+97) 
        + String.fromCharCode(utility.randomNumberBetween(1,10)+97) 
        + String.fromCharCode(utility.randomNumberBetween(1,5)+97) 
        + String.fromCharCode(utility.randomNumberBetween(1,10)+97) 
        + String.fromCharCode(utility.randomNumberBetween(1,5)+97) 
        + String.fromCharCode(utility.randomNumberBetween(1,5)+97)
        + String.fromCharCode(utility.randomNumberBetween(1,3)+97)
        + String.fromCharCode(utility.randomNumberBetween(3,5)+97);

      ctx.nutroStore[p] = 3;
      ctx.nuciumStore[p] = 3;
      ctx.waterStore[p] = 3;
      ctx.hasPlant[p] = true;
    }    
  
  }
}

function SetSunlight(ctx)
{
  var equator = Math.round(ctx.rows * ctx.tilt);

  var minSunlight = 1;
  var maxSunlight = 100;

  var distanceBeforeTundra = Math.round(ctx.rows / 1.6);

  var lightOnRow = 0;

  for (var y = 0; y < ctx.rows; ++y)
  {
    //  Determining sunlight value
    var distanceToEquator = Math.abs(equator - y);

    if (distanceToEquator > distanceBeforeTundra)
    {
      lightOnRow = minSunlight;
    }
    else if (distanceToEquator == 0)
    {
      lightOnRow = maxSunlight;
    }
    else
    {
      var lightRatio =1-( distanceToEquator / distanceBeforeTundra);
      lightOnRow = Math.round((maxSunlight-minSunlight) * lightRatio);
    }

    //  Setting sunlight value
    for (var x = 0; x < ctx.columns; ++x)
    {
      ctx.sunlight[ctx.ConvertToZ({f:x, s:y})] = lightOnRow;
    }
  }
}

function EstimateRainfall(ctx)
{
  // var temperature = new Array(ctx.area);
  // var moisture = new Array(ctx.area);

  // //var pendingTemperature = new Array(ctx.area);
  // //var pendingMoisture = new Array(ctx.area);

  // //  Creating the wind!
  // for (var m = 0; m < ctx.area; m++)
  // {
  //     temperature[m] = ctx.sunlight[m];
  //     moisture[m] = 5;

  //     //pendingMoisture[m] = 0;
  //     //pendingTemperature[m] = 0;
  // }

  //var rainLikelihood = new Array(ctx.area);
  //var windDirection = ctx.rotation;

  // for (var m = 0; m < ctx.area; m++)
  // {
  //     var coord = ctx.ConvertToCoord(m);
  //     rainLikelihood[m]=0;


    

  //     var previousCoord = ctx.ConvertToZ({f:coord.f+windDirection,s:coord.s});
  //     var upCoord = ctx.ConvertToZ({f:nextCoord.f,s:nextCoord.s-1});
  //     var downCoord = ctx.ConvertToZ({f:nextCoord.f,s:nextCoord.s+1});
    
  //     //  This province has water
  //     if(ctx.depth[m] > 0)
  //     {
  //         rainLikelihood[m]++;
  //     }
    
  //     if(ctx.depth[previousCoord] == 0)
  //     {
  //         rainLikelihood[m]--;
  //     }

  //     if( coord.y < Math.round(ctx.rows * ctx.tilt))
  //     {
  //         //Above equator
      
  //     }
  //     else if(coord.y > Math.round(ctx.rows * ctx.tilt))
  //     {
  //         //Below
      
  //     }
  //     else
  //     {
  //         //on
  //     }



  //     rainLikelihood[m] *= sunlight[m];

  // }

  // for (var q = 0; q < 1000; q++)
  // {
  //     //  Clear pending changes
  //     for (var m = 0; m < ctx.area; m++)
  //     {
  //         pendingMoisture[m] = 0;
  //         pendingTemperature[m] = 0;
  //     }

  //     //  Collecting temperature and moisture from environment
  //     for (var m = 0; m < ctx.area; m++)
  //     {
  //         //  Moisture
  //         if (ctx.depth[m] > 0.0)
  //         {
  //             //  % chance of gaining moisture from ocean 
  //             if (utility.randomNumberBetween(0, 100) > 60) moisture[m]++;
        
  //             //  Don't exceed a moisture of 10
  //             if (moisture[m] > 10) moisture[m] = 10;
  //         }
  //         else
  //         {
  //             //  And losing it to land
  //             moisture[m] -= 2;
  //             if (utility.randomNumberBetween(0, 100) > 60) moisture[m]--;
  //             if (moisture[m] < 0) moisture[m] = 0;
  //         }

  //         //  Temperature
  //         if (ctx.sunlight[m] > temperature[m])
  //         {
  //             //  Gaining temperature from sunlight
  //             temperature[m]++;
  //             moisture[m]++;
  //             if (temperature[m] > 10) temperature[m] = 10;
  //         }
  //         else
  //         {
  //             temperature[m] -= 2;
  //             if (temperature[m] < 0) temperature[m] = 0;
  //         }

  //         //  Artic regions killing moisture
  //         if (temperature[m] <= 1)
  //         {
  //             moisture[m] -= 3;
  //             if (moisture[m] < 0) moisture[m] = 0;
  //         }
  //         else if (temperature[m] <= 3)
  //         {
  //             moisture[m] -= 2;
  //             if (moisture[m] < 0) moisture[m] = 0;
  //         }

  //     }
  //     //  Moving wind!
  //     for (var m = 0; m < ctx.area; m++)
  //     {
  //         var coord = ctx.ConvertToCoord(m);

  //         var nextCoord = ctx.ConvertToZ({f:coord.f+windDirection,s:coord.s});
  //         var upCoord = ctx.ConvertToZ({f:nextCoord.f,s:nextCoord.s-1});
  //         var downCoord = ctx.ConvertToZ({f:nextCoord.f,s:nextCoord.s+1});
      
  //         if (temperature[m] > pendingTemperature[nextCoord]
  //             &&
  //             moisture[m] > pendingMoisture[nextCoord])
  //         {
  //             pendingTemperature[nextCoord] = temperature[m]++;
  //             pendingMoisture[nextCoord] = moisture[m]++;
  //         }
  //         if (temperature[m] > pendingTemperature[upCoord]
  //             &&
  //             moisture[m] > pendingMoisture[upCoord])
  //         {
  //             pendingTemperature[upCoord] = temperature[m]++;
  //             pendingMoisture[upCoord] = moisture[m]++;
  //         }
  //         if (temperature[m] > pendingTemperature[downCoord]
  //             &&
  //             moisture[m] > pendingMoisture[downCoord])
  //         {
  //             pendingTemperature[downCoord] = temperature[m]++;
  //             pendingMoisture[downCoord] = moisture[m]++;
  //         }
  //     }

  //     //  Applying pending changes to 
  //     for (var m = 0; m < ctx.area; m++)
  //     {
  //         temperature[m] = pendingTemperature[m];
  //         moisture[m] = pendingMoisture[m];
  //     }
  // }

  //  Applying the final moisture
  for (var m = 0; m < ctx.area; m++)
  {
    //console.log(moisture[m]);
    ctx.rainfall[m] = 100 * (Math.abs((ctx.rows/2) - ctx.ConvertToCoord(m).s)/(ctx.rows/2));
  }
}


