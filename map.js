var mapG = {
    map: null,
    rentGroup: L.layerGroup(),
    polygonGroup: L.layerGroup(),
    parkGroup: L.layerGroup(),
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


            mapG.rentGroup.addTo(mapG.map);
            mapG.polygonGroup.addTo(mapG.map);
            mapG.parkGroup.addTo(mapG.map);
            mapG.radiusCircle.addTo(mapG.map);

            mapG.map.on('moveend', function (e) {
                var latLng = mapG.map.getCenter();
                vm.latLng = latLng;
            });

            var baseMap_PHOTO_MIX = L.tileLayer('https://wmts.nlsc.gov.tw/wmts/PHOTO_MIX/default/GoogleMapsCompatible/{z}/{y}/{x}', {
                maxZoom: 20,
                zIndex: 1,
            }); //正射影像(混合)

            var baseMap_EMAP = L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
                maxZoom: 20,
                zIndex: 1
            }); //臺灣通用電子地圖

            baseMap_EMAP.addTo(mapG.map);
            var baseMaps = {
                "正射影像(混合)": baseMap_PHOTO_MIX,
                "臺灣通用電子地圖": baseMap_EMAP
            }; //底圖
            L.control.layers(baseMaps, null, {
                position: 'bottomright'
            }).addTo(mapG.map);

            vm.getCurrentPosition();
            vm.getPolygon();
        }, //載入地圖
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
        }, //定位使用者位置
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
                data: JSON.stringify({
                    "StationID": "",
                    "IsMotor": isMotor
                })
            })
                .done(function (result) {
                    console.log(result);
                    if (result.ErrorMessage == "Success") {
                        vm.setPolygonObj(result.Data.PolygonObj);
                    } else {
                        vm.errorMessage = result.ErrorMessage;
                    }
                })
                .always(function () { })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    console.log(jqXHR, textStatus, errorThrown);
                });

        },
        setPolygonObj: function (polygonObj) {
            mapG.polygonGroup.clearLayers();
            var holeLatlngs = [];
            var wkt = new Wkt.Wkt();
            polygonObj.forEach(e => {
                wkt.read(e);
                var polygon = wkt.toObject();
                holeLatlngs.push(polygon.getLatLngs());
            });

            L.polygon([
                [
                    [
                        [90, -180],
                        [90, 180],
                        [-90, 180],
                        [-90, -180]
                    ]
                ],
                holeLatlngs
            ], {
                color: 'gray',
                weight: 1,
                fillOpacity: 0.5,
            })
                .addTo(mapG.polygonGroup);
        },
        /** 更新資料 */
        getRent: function () {
            var vm = this;
            vm.setRadiusCircle(vm.radius, vm.latLng.lat, vm.latLng.lng);
            switch (vm.type) {
                case "m":
                    vm.getRent_m(vm.token, vm.radius, vm.latLng.lat, vm.latLng.lng);
                    break;
                case "c":
                    vm.getRent_c(vm.token, vm.radius, vm.latLng.lat, vm.latLng.lng);
                    break;
            }
        },
        /** 取得機車 */
        getRent_m: function (token, radius, lat, lng) {
            var vm = this;

            $.ajax({
                url: "https://irentcar-app.azurefd.net/api/MotorRent",
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    "Radius": radius,
                    "ShowALL": 0,
                    "Latitude": lat,
                    "Longitude": lng
                })
            })
                .done(function (result) {
                    console.log(result);
                    if (result.ErrorMessage == "Success") {
                        vm.setRentObj(result.Data.MotorRentObj, "m");
                    } else {
                        vm.errorMessage = result.ErrorMessage;
                    }
                })
                .always(function () { })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    console.log(jqXHR, textStatus, errorThrown);
                });
        },
        /** 取得汽車 */
        getRent_c: function (token, radius, lat, lng) {
            var vm = this;

            $.ajax({
                url: "https://irentcar-app.azurefd.net/api/AnyRent",
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    "Radius": radius,
                    "ShowALL": 0,
                    "Latitude": lat,
                    "Longitude": lng
                })
            })
                .done(function (result) {
                    if (result.ErrorMessage == "Success") {
                        vm.setRentObj(result.Data.AnyRentObj, "c");
                        vm.setParkAreaObj(result.Data.ParkAreaObj, "c");
                    } else {
                        vm.errorMessage = result.ErrorMessage;
                    }
                })
                .always(function () { })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    console.log(jqXHR, textStatus, errorThrown);
                });
        },
        /** 設定半徑範圍 */
        setRadiusCircle: function (radius, lat, lng) {
            mapG.radiusCircle.setRadius(radius * 1000);
            mapG.radiusCircle.setLatLng([lat, lng]);

        },
        /** 顯示車輛位置 */
        setRentObj: function (rentObj, type) {
            mapG.rentGroup.clearLayers();
            console.log(rentObj);
            rentObj.forEach(e => {
                var popupContent = "";
                switch (type) {
                    case "m":
                        popupContent = `\
                        <div><b>車號:</b>${e.CarNo}</div>\
                        <div><b>車型:</b>${e.CarTypeName}</div>\
                        <div><b>電量:</b>${e.Power}%</div>\
                        <div><b>折扣:</b>${e.DiscountLabel.Describe}</div>\
                        `;
                        break;
                    case "c":
                        popupContent = `\
                        <div><b>車號:</b>${e.CarNo}</div>\
                        <div><b>車型:</b>${e.CarTypeName}</div>\
                        <div><b>折扣:</b>${e.DiscountLabel.Describe}</div>\
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
                        textColor: e.DiscountLabel.Describe ? 'white' : 'red',
                        backgroundColor: e.DiscountLabel.Describe ? 'red' : 'white',
                    }),
                })
                    .bindPopup(popupContent)
                    .addTo(mapG.rentGroup);

            });
        },
        /** 顯示停車場位置 */
        setParkAreaObj: function (parkAreaObj, type) {
            var vm = this;

            mapG.parkGroup.clearLayers();
            console.log(parkAreaObj);
            parkAreaObj.forEach(e => {
                const haveCar = e.HaveCar == "Y"        //可租用車輛
                const haveConn = e.HaveConn == "Y"      //連線狀態
                const haveFilter = e.HaveFilter == "Y"
                const haveQuota = e.HaveQuota == "Y"    //還車額度
                const proParking = e.ProParking == 1    //僅PRO會員可還車

                if (!haveFilter)
                    console.log(e.ParkingName);

                //無車輛就不顯示
                // if (!haveCar)
                //     return
                var popupContent = "";
                switch (type) {
                    case "c":
                        popupContent = `\
                        <table>
                        <tr><th>名稱</th> <td>${e.ParkingName}</td></tr>\
                        <tr><th>可租用車輛</th> <td>${vm.convert_have(haveCar)}</td></tr>\
                        <tr><th>僅PRO會員可還車</th> <td>${vm.convert_is(proParking)}</td></tr>\
                        <tr><th>還車額度</th> <td>${vm.convert_have(haveQuota)}</td></tr>\
                        </table>
                        `;
                        break;
                }

                L.marker([e.ParkingLat, e.ParkingLng], {
                    icon: L.BeautifyIcon.icon({
                        icon: "building",
                        isAlphaNumericIcon: false,
                        text: vm.convert_have(haveCar),
                        innerIconAnchor: [0, 0],
                        borderColor: !haveCar ? 'black' : 'red',
                        textColor: !haveCar ? 'white' : 'red',
                        backgroundColor: !haveCar ? 'black' : 'white',
                    }),
                })
                    .bindPopup(popupContent)
                    .addTo(mapG.rentGroup);

            });
        },
        /** 有無 */
        convert_have: function (v) {
            return v == true ? "有" : "無"
        },
        /** 是否 */
        convert_is: function (v) {
            return v == true ? "是" : "否"
        }
    },
    watch: {
        'type': function (newValue) {
            this.getPolygon();
            this.getRent();
            mapG.rentGroup.clearLayers();
            mapG.parkGroup.clearLayers();
        },
        'radius': function (newValue) {
            this.getRent();
            mapG.rentGroup.clearLayers();
            mapG.parkGroup.clearLayers();
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
Vue.createApp(app).mount('#app');