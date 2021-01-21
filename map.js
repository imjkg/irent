var mapG = {
    map: null,
    pointGroup: L.layerGroup(),
    polygonGroup: L.layerGroup(),
    batteryGroup: L.layerGroup(),
    radiusCircle: L.circle([0, 0], {
        radius: 1,
        color: 'red',
        fill: false,
        opacity: 0.2
    }),
};

const app = {
    data() {
        return {
            token: "",
            type: "m",
            radius: 2,
            latLng: {
                lat: 0,
                lng: 0,
            },
            errorMessage: "Success"
        }
    },
    methods: {
        initMap: function () {
            var vm = this;
            mapG.map = L.map('map', {
                attributionControl: false,
                zoomControl: false
            }).setView([24, 120.5], 14);

            L.control.zoom({
                position: 'bottomleft'
            }).addTo(mapG.map);

            L.control.scale({
                imperial: false
            }).addTo(mapG.map);


            mapG.pointGroup.addTo(mapG.map);
            mapG.polygonGroup.addTo(mapG.map);
            mapG.batteryGroup.addTo(mapG.map);
            mapG.radiusCircle.addTo(mapG.map);

            mapG.map.on('moveend', function (e) {
                var latLng = mapG.map.getCenter();
                vm.latLng = latLng;
            });

            var baseMap_PHOTO_MIX = L.tileLayer('https://wmts.nlsc.gov.tw/wmts/PHOTO_MIX/default/GoogleMapsCompatible/{z}/{y}/{x}', {
                maxZoom: 20,
                zIndex: 1,
            });  //正射影像(混合)

            var baseMap_EMAP = L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
                maxZoom: 20,
                zIndex: 1
            }); //臺灣通用電子地圖

            baseMap_EMAP.addTo(mapG.map);
            var baseMaps = {
                "正射影像(混合)": baseMap_PHOTO_MIX,
                "臺灣通用電子地圖": baseMap_EMAP
            };  //底圖
            L.control.layers(baseMaps, null, { position: 'bottomright' }).addTo(mapG.map);

            vm.getCurrentPosition();
            vm.getPolygon();
        },  //載入地圖
        getCurrentPosition: function () {
            var vm = this;

            if (!navigator.geolocation) {
                console.log("您的瀏覽器不支援地理位置定位");
                return;
            }

            function success(position) {
                var latitude = position.coords.latitude;
                var longitude = position.coords.longitude;

                var latlng = L.latLng(latitude, longitude);
                mapG.map.setView(latlng, 15);

                L.marker([latitude, longitude], {
                    icon: L.BeautifyIcon.icon({
                        icon: 'child',
                        iconShape: 'marker',
                        borderColor: 'black',
                        textColor: 'black',
                        backgroundColor: 'transparent'
                    }),
                })
                    .bindTooltip("<div>你在這裡</div>")
                    .addTo(mapG.map);
            };

            function error(error) {
                console.log(error);
            };

            navigator.geolocation.getCurrentPosition(success, error);
        },  //定位使用者位置
        getPolygon: function () {
            var vm = this;

            var isMotor = 0;
            switch (vm.type) {
                case "m":
                    isMotor = 1
                    break;
                case "c":
                    isMotor = 0
                    break;
            }

            $.ajax({
                url: "https://irentcar-app.azurefd.net/api/GetPolygon",
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({ "StationID": "", "IsMotor": isMotor })
            })
                .done(function (result) {
                    if (result.ErrorMessage == "Success") {
                        vm.setPolygonObj(result.Data.PolygonObj);
                    }
                    else {
                        vm.errorMessage = result.ErrorMessage;
                    }
                })
                .always(function () { })
                .fail(function (jqXHR, textStatus, errorThrown) { console.log(jqXHR, textStatus, errorThrown); });

        },
        setPolygonObj: function (polygonObj) {
            mapG.polygonGroup.clearLayers();

            var wkt = new Wkt.Wkt();
            polygonObj.forEach(e => {
                wkt.read(e);
                var polygon = wkt.toObject();
                polygon.setStyle({
                    color: 'green',
                    weight: 2,
                    //fill: false,
                    fillOpacity: 0.1
                });
                polygon.addTo(mapG.polygonGroup);
            });
        },
        getRent: function () {
            var vm = this;
            vm.setRadiusCircle(vm.radius, vm.latLng.lat, vm.latLng.lng);
            switch (vm.type) {
                case "m":
                    vm.getRent_m(vm.token, vm.radius, vm.latLng.lat, vm.latLng.lng);
                    vm.getBatExchangeStation(vm.token, vm.radius, vm.latLng.lat, vm.latLng.lng);
                    break;
                case "c":
                    vm.getRent_c(vm.token, vm.radius, vm.latLng.lat, vm.latLng.lng);
                    break;
            }
        },
        getRent_m: function (token, radius, lat, lng) {
            var vm = this;

            $.ajax({
                url: "https://irentcar-app.azurefd.net/api/MotorRent",
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({ "Radius": radius, "ShowALL": 0, "Latitude": lat, "Longitude": lng })
            })
                .done(function (result) {
                    if (result.ErrorMessage == "Success") {
                        vm.setRentObj(result.Data.MotorRentObj, radius, lat, lng, "m");
                    }
                    else {
                        vm.errorMessage = result.ErrorMessage;
                    }
                })
                .always(function () { })
                .fail(function (jqXHR, textStatus, errorThrown) { console.log(jqXHR, textStatus, errorThrown); });
        },
        getRent_c: function (token, radius, lat, lng) {
            var vm = this;

            $.ajax({
                url: "https://irentcar-app.azurefd.net/api/AnyRent",
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({ "Radius": radius, "ShowALL": 0, "Latitude": lat, "Longitude": lng })
            })
                .done(function (result) {
                    if (result.ErrorMessage == "Success") {
                        vm.setRentObj(result.Data.AnyRentObj, radius, lat, lng, "c");
                    }
                    else {
                        vm.errorMessage = result.ErrorMessage;
                    }
                })
                .always(function () { })
                .fail(function (jqXHR, textStatus, errorThrown) { console.log(jqXHR, textStatus, errorThrown); });
        },
        setRadiusCircle: function (radius, lat, lng) {
            mapG.radiusCircle.setRadius(radius * 1000);
            mapG.radiusCircle.setLatLng([lat, lng]);

        },
        setRentObj: function (rentObj, radius, lat, lng, type) {
            console.log(rentObj);
            mapG.pointGroup.clearLayers();
            rentObj.forEach(e => {
                var popupContent = "";
                switch (type) {
                    case "m":
                        popupContent = `\
                        <div><b>車號:</b>${e.CarNo}</div>\
                        <div><b>車型:</b>${e.CarTypeName}</div>\
                        <div><b>電量:</b>${e.Power}%</div>\
                        `;
                        break;
                    case "c":
                        popupContent = `\
                        <div><b>車號:</b>${e.CarNo}</div>\
                        <div><b>車型:</b>${e.CarTypeName}</div>\
                        `;
                        break;
                }

                L.marker([e.Latitude, e.Longitude], {
                    icon: L.BeautifyIcon.icon({
                        icon: type == "m" ? 'motorcycle' : 'car',
                        isAlphaNumericIcon: type == "m",
                        text: e.Power,
                        innerIconAnchor: [0, 0],
                        borderColor: 'red',
                        textColor: 'red'
                    }),
                })
                    .bindPopup(popupContent)
                    .addTo(mapG.pointGroup);

            });
        },
        getBatExchangeStation: function (token, radius, lat, lng) {
            console.log({ "ShowALL": 0, "Longitude": lng, "Radius": radius, "Latitude": lat });
            var vm = this;

            $.ajax({
                url: "https://irentcar-app.azurefd.net/api/BatExchangeStation",
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({ "ShowALL": 0, "Longitude": lng, "Radius": radius, "Latitude": lat })
            })
                .done(function (result) {
                    console.log(result);
                    if (result.ErrorMessage == "Success") {
                        vm.setBatExchangeStation(result.Data.BatExchangeStationObj, radius, lat, lng);
                    }
                    else {
                        vm.errorMessage = result.ErrorMessage;
                    }
                })
                .always(function () { })
                .fail(function (jqXHR, textStatus, errorThrown) { console.log(jqXHR, textStatus, errorThrown); });
        },
        setBatExchangeStation: function (batExchangeStationObj, radius, lat, lng) {
            console.log(batExchangeStationObj);
            mapG.batteryGroup.clearLayers();
            batExchangeStationObj.forEach(e => {
                var popupContent = `\
                <div><b>名稱:</b>${e.Name}</div>\
                <div><b>地址:</b>${e.Addr}</div>\
                <div><b>可借:</b>${e.FullCnt} <b>可還:</b>${e.EmptyCnt}</div>\
                `;

                L.marker([e.Latitude, e.Longitude], {
                    icon: L.BeautifyIcon.icon({
                        icon: 'bolt',
                        borderColor: 'white',
                        backgroundColor: 'navy',
                        textColor: 'yellow'
                    }),
                })
                    .bindPopup(popupContent)
                    .addTo(mapG.batteryGroup);
            });
        },
    },
    watch: {
        'type': function (newValue) {
            this.getPolygon();
            this.getRent();
            mapG.pointGroup.clearLayers();
            if (newValue == "c") {
                mapG.batteryGroup.clearLayers();
            }
        },
        'radius': function (newValue) {
            this.getRent();
            mapG.pointGroup.clearLayers();
        },
        'latLng': function (newValue) {
            this.getRent();
        },
        'errorMessage': function (newValue) {
            $('#toast_errorMessage').toast('show');
        },
    },
    mounted: function () {
        this.initMap();
    },
}
Vue.createApp(app).mount('#app')
