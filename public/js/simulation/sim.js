var ctx = new Context("babo", 80  , 50, 0.5f, 1,5,5);

var unresolvedWater;

var simulationRunner = module.exports = {};

simulationRunner.createSimulation = function() {

};

simulationRunner.simulateYears = function(simName, numberYears) {

};

simulationRunner.stopSimulation = function(simName) {

};    



function CreateSimulation(ctx)
{
	CreateLandmass();
	CreateOcean(ctx.area * fillToDepth); //  Each tile would get 25
}

function CreatingLandmass()
{
    for (var c = 0; c < 3; c++)
    {
        //  Create continent height

        var centerContinentX = -1;
        var centerContinentY = -1;

        while (centerContinentX == -1 || centerContinentY == -1)
        {
            var attemptedX = (ctx.numberColumns / 2) + RandomNumberBetween(-ctx.numberColumns / 4, ctx.numberColumns / 4);
            var attemptedY = (ctx.numberRows / 2) + RandomNumberBetween(-ctx.numberRows / 3, ctx.numberRows / 3);

            if (continentMap[ctx.GetCoordinate(attemptedX, attemptedY)] == 0)
            {
                centerContinentX = attemptedX;
                centerContinentY = attemptedY;
            }
        }

        //How far we venture from the continent to place a blob
        var radius = ((ctx.numberColumns + ctx.numberRows) / 2) / 6;

        for (var i = 0; i < 3; i++)
        {
            var blobX = centerContinentX - (radius / 2) + (RandomNumberBetween(radius));
            var blobY = centerContinentY - (radius / 2) + (RandomNumberBetween(radius));
            var blob_radius = radius / (RandomNumberBetween(3) + 1);

            var blobResults = ctx.GetRingOfCoordinates(blobX, blobY, blob_radius, true);

            for (var p = 0; p < blobResults.Count; p++)
            {
                ctx.height[blobResults[p]] = fillToDepth + 5;
            }
        }
    }
}
function CreateOcean(totalWaterRequired)
{
	var numberPillars = 10;
	for (var p = 0; p < numberPillars; p++)
    {
        var pillarZ = -1;

        while (pillarZ == -1)
        {
            var attemptedZ = RandomNumberBetween(0, ctx.totalSize);

            if (continentMap[attemptedZ] == 0)
            {
                pillarZ = attemptedZ;
            }
        }

        CreatePillarOfWaterAtZ(z, totalWaterRequired /numberPillars);
    }	

    ResolveWater();
}
function CreatePillarOfWaterAtZ(z, unitsOfWater)
{
	ctx.depth[z] += unitsOfWater;
	unresolvedWater[z] = true;
}
function ResolveWater()
{
	var isFlat = true;
    var accuracy = 0;//0.05;//0.005;

    do
    {
        isFlat = true; //  Reset test that ocean is flat

        //  Check each coordinate for weird things
        for (var z = 0; z < ctx.area; z++)
        {
            if (unresolvedWater[z] == false)
                continue;

            var depth = ctx.depth[z];

            if (depth == 0)
            {
                //  There is no water to resolve
                unresolvedWater[z] = true;
                continue;
            }

            var height = ctx.height[z];
            var elevation = depth + height;

            var neighbors = ctx.GetNeighbors(z, false);

            var numberPossibleDonees = 0;
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

                        if (slope > steepest_slope_value)
                        {
                            steepest_slope = n;
                            steepest_slope_value = slope;
                        }
                    }

                    //  Do we have an upward slope that is too great?
                    if (slope < -accuracy)
                    {
                        //  If that plot has water then it needs to queue up for it
                        if (neighborDepth > 0)
                        {
                            unresolvedWater[n_index] = true;
                        }
                    }
                }

                if (numberPossibleDonees >= 1)
                {
                    //  There was at least one downward slope that was too great

                    var n_index = neighbors[steepest_slope];
                    unresolvedWater[n_index] = true;

                    //  Can we pass half our height difference
                    if (ctx.depth[z] > (steepest_slope_value / 2))
                    {
                        //  Yes we can
                        ctx.depth[z] -= (steepest_slope_value / 2);
                        ctx.depth[n_index] += (steepest_slope_value / 2);
                    }
                    else
                    {
                        //  No we cant give enoguht to level them so we give all instead
                        ctx.depth[n_index] += ctx.depth[z];
                        ctx.depth[z] = 0;
                    }


                }
                else
                {
                    //  There was nothing to put out so 
                    unresolvedWater[z] = false;
                }
            }
            //If we had more than one possibility than we can try again
            while (numberPossibleDonees > 1 && ctx.depth[z] > 0);
        }

    }
    while (isFlat == false);
}

/*var ctx = new Context("babo", 80  , 50, 0.5f, 1,5,5);

var unresolvedWater;

function RandomNumberBetween(inclusive, exclusive)
{
    return ((exclusive-inclusive)*Math.random()) + inclusive;
}

module.exports = {
    CreateSimulation: function (ctx) {

        CreateLandmass();
        CreateOcean(ctx.area * fillToDepth); 
    },
    CreateLandmass: function() {
        
        for (var c = 0; c < 3; c++)
        {
            //  Create continent height

            var centerContinentX = -1;
            var centerContinentY = -1;

            while (centerContinentX == -1 || centerContinentY == -1)
            {
                var attemptedX = (ctx.numberColumns / 2) + RandomNumberBetween(-ctx.numberColumns / 4, ctx.numberColumns / 4);
                var attemptedY = (ctx.numberRows / 2) + RandomNumberBetween(-ctx.numberRows / 3, ctx.numberRows / 3);

                if (continentMap[ctx.GetCoordinate(attemptedX, attemptedY)] == 0)
                {
                    centerContinentX = attemptedX;
                    centerContinentY = attemptedY;
                }
            }

            //How far we venture from the continent to place a blob
            var radius = ((ctx.numberColumns + ctx.numberRows) / 2) / 6;

            for (var i = 0; i < 3; i++)
            {
                var blobX = centerContinentX - (radius / 2) + (RandomNumberBetween(radius));
                var blobY = centerContinentY - (radius / 2) + (RandomNumberBetween(radius));
                var blob_radius = radius / (RandomNumberBetween(3) + 1);

                var blobResults = ctx.GetRingOfCoordinates(blobX, blobY, blob_radius, true);

                for (var p = 0; p < blobResults.Count; p++)
                {
                    ctx.height[blobResults[p]] = fillToDepth + 5;
                }
            }
        }
    },
    CreateOcean: function(totalWaterRequired) {
        var numberPillars = 10;
        for (var p = 0; p < numberPillars; p++)
        {
            var pillarZ = -1;

            while (pillarZ == -1)
            {
                var attemptedZ = RandomNumberBetween(0, ctx.totalSize);

                if (continentMap[attemptedZ] == 0)
                {
                    pillarZ = attemptedZ;
                }
            }

            CreatePillarOfWaterAtZ(z, totalWaterRequired /numberPillars);
        }   

        ResolveWater();
    },
    CreatePillarOfWaterAtZ: function(z,unitsOfWater) {
        ctx.depth[z] += unitsOfWater;
        unresolvedWater[z] = true;
    },
    ResolveWater: function() {
        var isFlat = true;
        var accuracy = 0;//0.05;//0.005;

        do
        {
            isFlat = true; //  Reset test that ocean is flat

            //  Check each coordinate for weird things
            for (var z = 0; z < ctx.area; z++)
            {
                if (unresolvedWater[z] == false)
                    continue;

                var depth = ctx.depth[z];

                if (depth == 0)
                {
                    //  There is no water to resolve
                    unresolvedWater[z] = true;
                    continue;
                }

                var height = ctx.height[z];
                var elevation = depth + height;

                var neighbors = ctx.GetNeighbors(z, false);

                var numberPossibleDonees = 0;
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

                            if (slope > steepest_slope_value)
                            {
                                steepest_slope = n;
                                steepest_slope_value = slope;
                            }
                        }

                        //  Do we have an upward slope that is too great?
                        if (slope < -accuracy)
                        {
                            //  If that plot has water then it needs to queue up for it
                            if (neighborDepth > 0)
                            {
                                unresolvedWater[n_index] = true;
                            }
                        }
                    }

                    if (numberPossibleDonees >= 1)
                    {
                        //  There was at least one downward slope that was too great

                        var n_index = neighbors[steepest_slope];
                        unresolvedWater[n_index] = true;

                        //  Can we pass half our height difference
                        if (ctx.depth[z] > (steepest_slope_value / 2))
                        {
                            //  Yes we can
                            ctx.depth[z] -= (steepest_slope_value / 2);
                            ctx.depth[n_index] += (steepest_slope_value / 2);
                        }
                        else
                        {
                            //  No we cant give enoguht to level them so we give all instead
                            ctx.depth[n_index] += ctx.depth[z];
                            ctx.depth[z] = 0;
                        }


                    }
                    else
                    {
                        //  There was nothing to put out so 
                        unresolvedWater[z] = false;
                    }
                }
                //If we had more than one possibility than we can try again
                while (numberPossibleDonees > 1 && ctx.depth[z] > 0);
            }

        }
        while (isFlat == false);
    }
};

*/

