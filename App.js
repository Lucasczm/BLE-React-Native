/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Platform, PermissionsAndroid, TouchableOpacity
} from 'react-native';


import BluetoothStateManager from 'react-native-bluetooth-state-manager';

import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const manager = new BleManager();


const App = () => {

  const [device, setDevice] = useState({
    connected: false,
    device: null,
    characteristics: []
  })
  const [msg, setMessage] = useState("");
  const scrollViewRef = useRef();
  useEffect(() => {
    if (Platform.OS === 'ios') {
      // Request IOS Bluetooth Permission/ON
    } else {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then(() => {
        BluetoothStateManager.enable()
          .then(result => {
            //Procura o nome UART Service
            scanAndConnect("UART Service");
          })
          .catch(err => {
            console.error('ble err', err);
          });
      });
    }
  }, [])


  const monitor = (err, cha) => {
    if (err) {
      console.error('Erro monitor', err);
      return;
    }
    let buff = Buffer.from(cha?.value, 'base64').toString('ascii');
    console.log("MSG BLE:", buff);
    setMessage(previousState => previousState + buff);
  }

  const sendMessage = (msg) => {
    if (device.characteristics[1])
      device.characteristics[1].writeWithoutResponse(Buffer.from(msg).toString('base64'))
        .then(() => {
          console.log('Mensagem enviada');
        })
        .catch(e => console.error('Error', e));

  }

  const scanAndConnect = async (deviceName, cb) => {
    manager.startDeviceScan(null, null, async (error, deviceCb) => {
      if (error) {
        console.error("BLE Scan", error)
        return;
      }
      // procura pelo nome do dispositivo
      if (deviceCb.name === deviceName) {
        console.log('Found BLE', deviceCb.name);
        //Para de procurar quando encontrado
        manager.stopDeviceScan();
        const connectedDevice = await deviceCb.connect();

        //descobre lista de serviços e caracteristicas
        const allServicesAndCharacteristics =
          await connectedDevice.discoverAllServicesAndCharacteristics();
        //descobre os serviços
        const discoveredServices =
          await allServicesAndCharacteristics.services();

        //Filtra o serviço UART do ESP32 "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
        const serviceUUID = discoveredServices.filter(service => service.uuid === "6e400001-b5a3-f393-e0a9-e50e24dcca9e")[0];

        if (!serviceUUID) {
          console.error("BLE Service UUID not found");
          return;
        }

        //obtem caracteristicas do serviço
        const characteristics = await serviceUUID.characteristics();

        //pega a primeira caracteristica e seta o monitor ( 0 para ler, 1 pra escrever)
        characteristics[0].monitor(monitor);
        characteristics[1].writeWithoutResponse(Buffer.from("Conectado").toString('base64'))
          .then(() => {
            console.log('Mensagem enviada');
          })
          .catch(e => console.error('Error', e));

        //seta estado da conexão
        setDevice({
          connected: true,
          device: deviceCb,
          characteristics: characteristics //vetor (0 para ler , 1 para escrever)
        })
      }
    });
  };


  return (
    <SafeAreaView style={styles.Container}>
      <Text style={[styles.Header, { marginTop: 10 }]}>{(device.connected) ? 'Conectado' : 'Não Conectado'}</Text>
      <Text style={styles.Header}>Recebido BLE:</Text>
      <ScrollView ref={scrollViewRef} style={styles.ScrollView} contentContainerStyle={styles.ScrollViewContent}
        onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}>
        <Text style={styles.Text}>
          {msg}
        </Text>
      </ScrollView>
      <TouchableOpacity style={styles.Button} onPress={() => { sendMessage("Oi\n") }}><Text>ENVIAR BLE</Text></TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({

  Container: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  Header: {
    marginLeft: 10,
    fontSize: 16,
    alignSelf: "flex-start"
  },
  ScrollView: {
    paddingHorizontal: 10,
    alignSelf: "stretch",
    margin: 10,
    backgroundColor: '#444',
    borderRadius: 5,

  },
  Text: {
    color: "#FFF",
  },
  ScrollViewContent: {
    padding: 5,
    marginBottom: 10,
  },
  Button: {
    height: 40,
    margin: 10,
    alignSelf: 'stretch',
    borderRadius: 10,
    backgroundColor: "#DADADA",
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  }
})

export default App;