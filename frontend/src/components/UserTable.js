import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserTable.css';
import axios from 'axios';

function UserTable() {
  const navigate = useNavigate();
  const [availablePokemon, setAvailablePokemon] = useState([
    { id: 1, name: 'Pikachu', breed: 'Electric', age: 2, healthStatus: 50, lastFed: new Date() },
    { id: 2, name: 'Bulbasaur', breed: 'Grass', age: 3, healthStatus: 40, lastFed: new Date() },
    { id: 3, name: 'Charmander', breed: 'Fire', age: 4, healthStatus: 30, lastFed: new Date() },
  ]);

  const [adoptedPokemon, setAdoptedPokemon] = useState([]);

  // Fetch adopted Pokémon when the component mounts
  useEffect(() => {
    const fetchAdoptedPokemon = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('http://localhost:5000/api/user/pokemon', {
            headers: { Authorization: token },
          });
          setAdoptedPokemon(response.data);
        } catch (error) {
          console.error('Error fetching adopted Pokémon:', error);
        }
      }
    };
    fetchAdoptedPokemon();
  }, []);

  const handleAdopt = async (pokemon) => {
    if (adoptedPokemon.some(p => p.id === pokemon.id)) {
      alert(`${pokemon.name} is already adopted!`);
      return;
    }

    const adopted = { ...pokemon, lastFed: new Date() };
    setAdoptedPokemon([...adoptedPokemon, adopted]);
    setAvailablePokemon(availablePokemon.filter(p => p.id !== pokemon.id));
    alert(`You have adopted ${pokemon.name}!`);

    // Send adoption request to the backend
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/pokemon/adopt',
        { name: pokemon.name, breed: pokemon.breed, age: pokemon.age, healthStatus: pokemon.healthStatus },
        { headers: { Authorization: token } }
      );
    } catch (error) {
      console.error('Error adopting Pokémon:', error);
    }
  };

  const handleFeed = async (pokemon) => {
    const updatedPokemon = adoptedPokemon.map(p =>
      p.id === pokemon.id
        ? { ...p, healthStatus: Math.min(p.healthStatus + 20, 100), lastFed: new Date() }
        : p
    );
    setAdoptedPokemon(updatedPokemon);

    // Send feed request to the backend
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/pokemon/feed/${pokemon.id}`, {}, { headers: { Authorization: token } });
    } catch (error) {
      console.error('Error feeding Pokémon:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    alert("You have logged out successfully!");
    navigate('/login');
  };

  return (
    <div className="user-table-container">
      <h2 className="title">Available Pokemon for Adoption</h2>
      <table className="pokemon-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Breed</th>
            <th>Age</th>
            <th>Health Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {availablePokemon.map((pokemon) => (
            <tr key={pokemon.id}>
              <td>{pokemon.name}</td>
              <td>{pokemon.breed}</td>
              <td>{pokemon.age}</td>
              <td>
                <div className="health-bar">
                  <div
                    className="health-fill"
                    style={{ width: `${pokemon.healthStatus}%`, backgroundColor: pokemon.healthStatus > 50 ? 'green' : 'red' }}
                  ></div>
                </div>
                <span>{pokemon.healthStatus}%</span>
              </td>
              <td>
                <button className="adopt-btn" onClick={() => handleAdopt(pokemon)}>Adopt</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="title">Adopted Pokémon</h2>
      <table className="pokemon-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Breed</th>
            <th>Age</th>
            <th>Health Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {adoptedPokemon.map((pokemon) => (
            <tr key={pokemon.id}>
              <td>{pokemon.name}</td>
              <td>{pokemon.breed}</td>
              <td>{pokemon.age}</td>
              <td>
                <div className="health-bar">
                  <div
                    className="health-fill"
                    style={{ width: `${pokemon.healthStatus}%`, backgroundColor: pokemon.healthStatus > 50 ? 'green' : 'red' }}
                  ></div>
                </div>
                <span>{pokemon.healthStatus}%</span>
              </td>
              <td>
                <button className="feed-btn" onClick={() => handleFeed(pokemon)}>Feed</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Logout Button */}
      <button className="logout-btn" onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default UserTable;
