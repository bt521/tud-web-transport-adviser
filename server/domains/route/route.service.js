const { isSafeInt } = require("../../lib/isSafeInt");
const RouteDAO = require("./route.dao");

const db = new RouteDAO();
// TODO: redo fetching routes, fetch all filter by time
exports.getRoutesWithRealtime = async (origin, destination) => {
  let combinedResults = [];

  try {
    const res = await db.getRoutesFromDB(origin, destination);
    if (res.length === 0) {
      console.error("results not found");
      return res;
    }

    for (const trip of res) {
      const realtime = await db.getTripUpdatesFromDB(
        trip["trip.id"],
        trip["start_stop.id"],
        trip["end_stop.id"]
      );

      const shapePath = await db.getTripShape(trip["trip.id"]);

      console.log("realtime", realtime);

      const combinedObject = {
        routeId: trip["route.id"],
        tripId: trip["trip.id"],
        route: trip["route.short_name"],
        agency: trip["agency.name"],
        startStopId: trip["start_stop.id"],
        endStopId: trip["end_stop.id"],
        startStopName: trip["start_stop.name"],
        endStopName: trip["end_stop.name"],
        departure: trip["start_stop_time.departure_time"],
        arrival: trip["end_stop_time.arrival_time"],
        realtimeArrival: isSafeInt(
          (realtime && realtime[0] && realtime[0]["st2.arrivalDelay"]) ?? null
        ),
        realtimeDeparture: isSafeInt(
          (realtime && realtime[0] && realtime[0]["st2.departureDelay"]) ?? null
        )
        // tripPath: shapePath,
      };
      combinedResults.push(combinedObject);
    }
    return combinedResults;
  } catch (error) {
    console.error(error);
  }
};

exports.getRoutesWithRealtimeV2 = async (origin, destination) => {
  let routes = [];
  console.log(origin, destination);

  try {
   
    const paths = await db
      .getRoutesFromDBV2(origin, destination)
      .then((paths) => paths.slice(0, 5));

    //console.log(paths);
    for (const path of paths) {
      const combined = {};
      const routeNodes = [];
      console.log("paths", path.properties);
      const shapePath = await db
        .getTripShape(path.trip.properties.id)
        .then((shapes) => shapes.map((shape) => [shape.lat, shape.lon]));

      const realtime = await db.getTripUpdatesFromDB(
        path.trip.properties.id,
        path.startStop.properties.id,
        path.endStop.properties.id
      );

      console.log("realtime", realtime);

      //
      combined.route = path.route.properties;
      combined.agency = path.agency.properties;
      combined.startStop = path.startStop.properties;
      combined.endStop = path.endStop.properties;
      combined.startStopTime = path.startStopTime.properties;
      combined.endStopTime = path.endStopTime.properties;
      combined.trip = path.trip.properties;
      combined.mapPath = shapePath;
      combined.realStart =
        (realtime && realtime[0] && realtime[0].startRealtime.high) ?? null;
      combined.realEnd =
        (realtime && realtime[0] && realtime[0].endRealtime.high) ?? null;
      path.stops;

      //combine the stops with the stoptimes
      for (const stop of path.stops) {
        //find the stoptime to go with tin
        const stoptime = path.pathNodes.find(
          (path) => path.properties.stop_id === stop.properties.id
        );

        routeNodes.push({
          name: stop.properties.name,
          id: stop.properties.id,
          latitude: stop.properties.lat,
          longitude: stop.properties.lon,
          arrivalTime: stoptime.properties.arrival_time,
          departureTime: stoptime.properties.departure_time
        });
      }

      combined.routeNodes = routeNodes.filter(
        (node, index, self) =>
          index === self.findIndex((stop) => stop.id === node.id)
      );

      routes.push(combined);
    }
    return routes;
  } catch (error) {
    console.log(error);
  }
};
